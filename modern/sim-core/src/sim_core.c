#include "sim_core.h"

#include <stdio.h>
#include <stddef.h>

enum {
  U6M_WORLD_BLOB_SIZE = 22,
  U6M_TICKS_PER_MINUTE = 4,
  U6M_MINUTES_PER_HOUR = 60,
  U6M_HOURS_PER_DAY = 24,
  U6M_DAYS_PER_MONTH = 28,
  U6M_MONTHS_PER_YEAR = 13,
  U6M_SNAPSHOT_MAGIC = 0x534d3655u, /* "U6MS" little-endian */
  U6M_SNAPSHOT_VERSION = 1,
  U6M_SNAPSHOT_HEADER_SIZE = 16,
  U6M_SNAPSHOT_PAYLOAD_SIZE = 16 + U6M_WORLD_BLOB_SIZE,
  U6M_COMMAND_WIRE_SIZE = 16
};

static uint32_t xorshift32(uint32_t x) {
  if (x == 0) {
    x = 0x6D2B79F5u;
  }
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return x;
}

static int32_t clamp_i32(int64_t value, int32_t lo, int32_t hi) {
  if (value < lo) {
    return lo;
  }
  if (value > hi) {
    return hi;
  }
  return (int32_t)value;
}

static void apply_command(SimState *state, const SimCommand *cmd) {
  switch (cmd->type) {
  case SIM_CMD_NOP:
    break;
  case SIM_CMD_MOVE_REL:
    state->world.map_x = clamp_i32((int64_t)state->world.map_x + cmd->arg0, -4096, 4095);
    state->world.map_y = clamp_i32((int64_t)state->world.map_y + cmd->arg1, -4096, 4095);
    break;
  case SIM_CMD_SET_FLAG:
    if (cmd->arg1) {
      state->world_flags |= (1u << (cmd->arg0 & 31));
    } else {
      state->world_flags &= ~(1u << (cmd->arg0 & 31));
    }
    break;
  case SIM_CMD_RNG_POKE:
    state->rng_state ^= (uint32_t)cmd->arg0;
    break;
  default:
    break;
  }
  state->commands_applied++;
}

static uint64_t hash_mix_u32(uint64_t h, uint32_t v) {
  h ^= (uint64_t)v;
  h *= 1099511628211ull;
  return h;
}

static uint16_t read_u16_le(const uint8_t *p) {
  return (uint16_t)((uint16_t)p[0] | ((uint16_t)p[1] << 8));
}

static uint32_t checksum32(const uint8_t *data, size_t len) {
  uint32_t h = 2166136261u;
  for (size_t i = 0; i < len; i++) {
    h ^= data[i];
    h *= 16777619u;
  }
  return h;
}

static void normalize_world_calendar(SimWorldState *w) {
  if (w->time_m >= U6M_MINUTES_PER_HOUR) {
    w->time_m %= U6M_MINUTES_PER_HOUR;
  }
  if (w->time_h >= U6M_HOURS_PER_DAY) {
    w->time_h %= U6M_HOURS_PER_DAY;
  }
  if (w->date_d == 0 || w->date_d > U6M_DAYS_PER_MONTH) {
    w->date_d = 1;
  }
  if (w->date_m == 0 || w->date_m > U6M_MONTHS_PER_YEAR) {
    w->date_m = 1;
  }
}

static void advance_world_minute(SimWorldState *w) {
  w->time_m++;
  if (w->time_m < U6M_MINUTES_PER_HOUR) {
    return;
  }
  w->time_m = 0;
  w->time_h++;
  if (w->time_h < U6M_HOURS_PER_DAY) {
    return;
  }
  w->time_h = 0;
  w->date_d++;
  if (w->date_d <= U6M_DAYS_PER_MONTH) {
    return;
  }
  w->date_d = 1;
  w->date_m++;
  if (w->date_m <= U6M_MONTHS_PER_YEAR) {
    return;
  }
  w->date_m = 1;
  w->date_y++;
}

static int16_t read_i16_le(const uint8_t *p) {
  return (int16_t)read_u16_le(p);
}

static uint32_t read_u32_le(const uint8_t *p) {
  return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static int32_t read_i32_le(const uint8_t *p) {
  return (int32_t)read_u32_le(p);
}

static void write_u16_le(uint8_t *p, uint16_t v) {
  p[0] = (uint8_t)(v & 0xffu);
  p[1] = (uint8_t)((v >> 8) & 0xffu);
}

static void write_i16_le(uint8_t *p, int16_t v) {
  write_u16_le(p, (uint16_t)v);
}

static void write_u32_le(uint8_t *p, uint32_t v) {
  p[0] = (uint8_t)(v & 0xffu);
  p[1] = (uint8_t)((v >> 8) & 0xffu);
  p[2] = (uint8_t)((v >> 16) & 0xffu);
  p[3] = (uint8_t)((v >> 24) & 0xffu);
}

static void write_i32_le(uint8_t *p, int32_t v) {
  write_u32_le(p, (uint32_t)v);
}

size_t sim_world_state_size(void) {
  return U6M_WORLD_BLOB_SIZE;
}

int sim_world_serialize(const SimWorldState *world, uint8_t *out, size_t out_size) {
  if (world == NULL || out == NULL) {
    return -1;
  }
  if (out_size < sim_world_state_size()) {
    return -2;
  }

  out[0] = world->is_on_quest;
  out[1] = world->next_sleep;
  out[2] = world->time_m;
  out[3] = world->time_h;
  out[4] = world->date_d;
  out[5] = world->date_m;
  write_u16_le(out + 6, world->date_y);
  write_i16_le(out + 8, world->wind_dir);
  out[10] = world->active;
  write_i32_le(out + 11, world->map_x);
  write_i32_le(out + 15, world->map_y);
  write_i16_le(out + 19, world->map_z);
  out[21] = (uint8_t)((world->in_combat ? 1u : 0u) | ((world->sound_enabled ? 1u : 0u) << 1));
  return 0;
}

int sim_world_deserialize(SimWorldState *world, const uint8_t *in, size_t in_size) {
  if (world == NULL || in == NULL) {
    return -1;
  }
  if (in_size < sim_world_state_size()) {
    return -2;
  }

  world->is_on_quest = in[0];
  world->next_sleep = in[1];
  world->time_m = in[2];
  world->time_h = in[3];
  world->date_d = in[4];
  world->date_m = in[5];
  world->date_y = read_u16_le(in + 6);
  world->wind_dir = read_i16_le(in + 8);
  world->active = in[10];
  world->map_x = read_i32_le(in + 11);
  world->map_y = read_i32_le(in + 15);
  world->map_z = read_i16_le(in + 19);
  world->in_combat = in[21] & 1u;
  world->sound_enabled = (in[21] >> 1) & 1u;
  return 0;
}

size_t sim_state_snapshot_size(void) {
  return U6M_SNAPSHOT_HEADER_SIZE + U6M_SNAPSHOT_PAYLOAD_SIZE;
}

int sim_state_snapshot_serialize(const SimState *state, uint8_t *out, size_t out_size) {
  uint8_t *payload;
  uint32_t sum;

  if (state == NULL || out == NULL) {
    return SIM_PERSIST_ERR_NULL;
  }
  if (out_size < sim_state_snapshot_size()) {
    return SIM_PERSIST_ERR_SIZE;
  }

  write_u32_le(out + 0, U6M_SNAPSHOT_MAGIC);
  write_u16_le(out + 4, U6M_SNAPSHOT_VERSION);
  write_u16_le(out + 6, U6M_SNAPSHOT_HEADER_SIZE);
  write_u32_le(out + 8, U6M_SNAPSHOT_PAYLOAD_SIZE);
  write_u32_le(out + 12, 0u);

  payload = out + U6M_SNAPSHOT_HEADER_SIZE;
  write_u32_le(payload + 0, state->tick);
  write_u32_le(payload + 4, state->rng_state);
  write_u32_le(payload + 8, state->world_flags);
  write_u32_le(payload + 12, state->commands_applied);

  if (sim_world_serialize(&state->world, payload + 16, U6M_WORLD_BLOB_SIZE) != 0) {
    return SIM_PERSIST_ERR_SIZE;
  }

  sum = checksum32(payload, U6M_SNAPSHOT_PAYLOAD_SIZE);
  write_u32_le(out + 12, sum);
  return SIM_PERSIST_OK;
}

int sim_state_snapshot_deserialize(SimState *state, const uint8_t *in, size_t in_size) {
  const uint8_t *payload;
  uint32_t magic;
  uint16_t version;
  uint16_t header_size;
  uint32_t payload_size;
  uint32_t expected_sum;
  uint32_t actual_sum;

  if (state == NULL || in == NULL) {
    return SIM_PERSIST_ERR_NULL;
  }
  if (in_size < U6M_SNAPSHOT_HEADER_SIZE) {
    return SIM_PERSIST_ERR_SIZE;
  }

  magic = read_u32_le(in + 0);
  version = read_u16_le(in + 4);
  header_size = read_u16_le(in + 6);
  payload_size = read_u32_le(in + 8);
  expected_sum = read_u32_le(in + 12);

  if (magic != U6M_SNAPSHOT_MAGIC) {
    return SIM_PERSIST_ERR_MAGIC;
  }
  if (version != U6M_SNAPSHOT_VERSION) {
    return SIM_PERSIST_ERR_VERSION;
  }
  if (header_size != U6M_SNAPSHOT_HEADER_SIZE || payload_size != U6M_SNAPSHOT_PAYLOAD_SIZE) {
    return SIM_PERSIST_ERR_SIZE;
  }
  if (in_size < (size_t)header_size + (size_t)payload_size) {
    return SIM_PERSIST_ERR_SIZE;
  }

  payload = in + header_size;
  actual_sum = checksum32(payload, payload_size);
  if (actual_sum != expected_sum) {
    return SIM_PERSIST_ERR_CHECKSUM;
  }

  state->tick = read_u32_le(payload + 0);
  state->rng_state = read_u32_le(payload + 4);
  state->world_flags = read_u32_le(payload + 8);
  state->commands_applied = read_u32_le(payload + 12);
  if (sim_world_deserialize(&state->world, payload + 16, U6M_WORLD_BLOB_SIZE) != 0) {
    return SIM_PERSIST_ERR_SIZE;
  }
  normalize_world_calendar(&state->world);
  return SIM_PERSIST_OK;
}

int sim_init(SimState *state, const SimConfig *cfg) {
  if (state == NULL || cfg == NULL) {
    return -1;
  }

  state->tick = 0;
  state->rng_state = cfg->seed;
  state->world_flags = 0;
  state->commands_applied = 0;
  state->world = cfg->initial_world;
  normalize_world_calendar(&state->world);
  return 0;
}

int sim_step_ticks(SimState *state,
                   const SimCommand *commands,
                   size_t command_count,
                   uint32_t tick_count,
                   SimStepResult *out_result) {
  uint32_t local_applied = 0;

  if (state == NULL) {
    return -1;
  }
  if (commands == NULL && command_count != 0) {
    return -2;
  }

  for (uint32_t i = 0; i < tick_count; i++) {
    uint32_t next_tick = state->tick + 1;

    for (size_t c = 0; c < command_count; c++) {
      if (commands[c].tick == next_tick) {
        apply_command(state, &commands[c]);
        local_applied++;
      }
    }

    state->rng_state = xorshift32(state->rng_state);
    state->world_flags ^= (state->rng_state & 1u);
    if ((next_tick % U6M_TICKS_PER_MINUTE) == 0u) {
      advance_world_minute(&state->world);
    }
    state->tick = next_tick;
  }

  if (out_result != NULL) {
    out_result->ticks_advanced = tick_count;
    out_result->commands_applied = local_applied;
    out_result->state_hash = sim_state_hash(state);
  }

  return 0;
}

uint64_t sim_state_hash(const SimState *state) {
  uint64_t h = 1469598103934665603ull;

  if (state == NULL) {
    return 0;
  }

  h = hash_mix_u32(h, state->tick);
  h = hash_mix_u32(h, state->rng_state);
  h = hash_mix_u32(h, state->world_flags);
  h = hash_mix_u32(h, state->commands_applied);
  h = hash_mix_u32(h, state->world.is_on_quest);
  h = hash_mix_u32(h, state->world.next_sleep);
  h = hash_mix_u32(h, state->world.time_m);
  h = hash_mix_u32(h, state->world.time_h);
  h = hash_mix_u32(h, state->world.date_d);
  h = hash_mix_u32(h, state->world.date_m);
  h = hash_mix_u32(h, state->world.date_y);
  h = hash_mix_u32(h, (uint32_t)(int32_t)state->world.wind_dir);
  h = hash_mix_u32(h, state->world.active);
  h = hash_mix_u32(h, (uint32_t)state->world.map_x);
  h = hash_mix_u32(h, (uint32_t)state->world.map_y);
  h = hash_mix_u32(h, (uint32_t)(int32_t)state->world.map_z);
  h = hash_mix_u32(h, state->world.in_combat);
  h = hash_mix_u32(h, state->world.sound_enabled);
  return h;
}

size_t sim_command_wire_size(void) {
  return U6M_COMMAND_WIRE_SIZE;
}

int sim_command_serialize(const SimCommand *cmd, uint8_t *out, size_t out_size) {
  if (cmd == NULL || out == NULL) {
    return -1;
  }
  if (out_size < sim_command_wire_size()) {
    return -2;
  }
  if ((int)cmd->type < (int)SIM_CMD_NOP || (int)cmd->type > (int)SIM_CMD_RNG_POKE) {
    return -3;
  }

  write_u32_le(out + 0, cmd->tick);
  out[4] = (uint8_t)cmd->type;
  out[5] = cmd->actor_id;
  out[6] = cmd->cmd_flags;
  out[7] = 0;
  write_i32_le(out + 8, cmd->arg0);
  write_i32_le(out + 12, cmd->arg1);
  return 0;
}

int sim_command_deserialize(SimCommand *cmd, const uint8_t *in, size_t in_size) {
  if (cmd == NULL || in == NULL) {
    return -1;
  }
  if (in_size < sim_command_wire_size()) {
    return -2;
  }

  cmd->tick = read_u32_le(in + 0);
  cmd->type = (SimCommandType)in[4];
  cmd->actor_id = in[5];
  cmd->cmd_flags = in[6];
  cmd->arg0 = read_i32_le(in + 8);
  cmd->arg1 = read_i32_le(in + 12);
  if ((int)cmd->type < (int)SIM_CMD_NOP || (int)cmd->type > (int)SIM_CMD_RNG_POKE) {
    return -3;
  }
  return 0;
}

int sim_command_stream_deserialize(SimCommand *out,
                                   size_t out_capacity,
                                   const uint8_t *in,
                                   size_t in_size,
                                   size_t *out_count) {
  size_t count;
  size_t wire;
  int rc;

  if (out == NULL || in == NULL || out_count == NULL) {
    return -1;
  }
  wire = sim_command_wire_size();
  if ((in_size % wire) != 0) {
    return -2;
  }
  count = in_size / wire;
  if (count > out_capacity) {
    return -3;
  }
  for (size_t i = 0; i < count; i++) {
    rc = sim_command_deserialize(&out[i], in + (i * wire), wire);
    if (rc != 0) {
      return rc;
    }
  }
  *out_count = count;
  return 0;
}

int sim_write_replay_checkpoints(const SimState *initial_state,
                                 const SimCommand *commands,
                                 size_t command_count,
                                 uint32_t total_ticks,
                                 uint32_t checkpoint_interval,
                                 const char *path) {
  SimState s;
  FILE *fp;
  uint32_t advanced = 0;

  if (initial_state == NULL || path == NULL || checkpoint_interval == 0) {
    return -1;
  }

  s = *initial_state;
  fp = fopen(path, "wb");
  if (fp == NULL) {
    return -2;
  }

  fprintf(fp, "tick,hash\n");
  while (advanced < total_ticks) {
    SimStepResult res;
    uint32_t step = checkpoint_interval;
    if (step > (total_ticks - advanced)) {
      step = total_ticks - advanced;
    }
    if (sim_step_ticks(&s, commands, command_count, step, &res) != 0) {
      fclose(fp);
      return -3;
    }
    advanced += step;
    fprintf(fp, "%u,%016llx\n", s.tick, (unsigned long long)res.state_hash);
  }

  fclose(fp);
  return 0;
}
