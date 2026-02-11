#include "sim_core.h"

#include <limits.h>
#include <stddef.h>

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
    state->player_x = clamp_i32((int64_t)state->player_x + cmd->arg0, -4096, 4095);
    state->player_y = clamp_i32((int64_t)state->player_y + cmd->arg1, -4096, 4095);
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

int sim_init(SimState *state, const SimConfig *cfg) {
  if (state == NULL || cfg == NULL) {
    return -1;
  }

  state->tick = 0;
  state->rng_state = cfg->seed;
  state->player_x = cfg->start_x;
  state->player_y = cfg->start_y;
  state->world_flags = 0;
  state->commands_applied = 0;
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
  h = hash_mix_u32(h, (uint32_t)state->player_x);
  h = hash_mix_u32(h, (uint32_t)state->player_y);
  h = hash_mix_u32(h, state->world_flags);
  h = hash_mix_u32(h, state->commands_applied);
  return h;
}
