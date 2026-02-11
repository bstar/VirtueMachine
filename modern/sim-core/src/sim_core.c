#include "sim_core.h"

#include <stddef.h>

enum {
  U6M_WORLD_BLOB_SIZE = 22
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

int sim_init(SimState *state, const SimConfig *cfg) {
  if (state == NULL || cfg == NULL) {
    return -1;
  }

  state->tick = 0;
  state->rng_state = cfg->seed;
  state->world_flags = 0;
  state->commands_applied = 0;
  state->world = cfg->initial_world;
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
    if ((state->tick & 3u) == 0u) {
      state->world.time_m = (uint8_t)((state->world.time_m + 1u) % 60u);
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
