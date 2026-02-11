#ifndef U6M_SIM_CORE_H
#define U6M_SIM_CORE_H

#include <stddef.h>
#include <stdint.h>

typedef enum SimCommandType {
  SIM_CMD_NOP = 0,
  SIM_CMD_MOVE_REL = 1,
  SIM_CMD_SET_FLAG = 2,
  SIM_CMD_RNG_POKE = 3
} SimCommandType;

typedef struct SimConfig {
  uint32_t seed;
  int32_t start_x;
  int32_t start_y;
} SimConfig;

typedef struct SimCommand {
  uint32_t tick;
  SimCommandType type;
  int32_t arg0;
  int32_t arg1;
} SimCommand;

typedef struct SimState {
  uint32_t tick;
  uint32_t rng_state;
  int32_t player_x;
  int32_t player_y;
  uint32_t world_flags;
  uint32_t commands_applied;
} SimState;

typedef struct SimStepResult {
  uint32_t ticks_advanced;
  uint32_t commands_applied;
  uint64_t state_hash;
} SimStepResult;

int sim_init(SimState *state, const SimConfig *cfg);

int sim_step_ticks(SimState *state,
                   const SimCommand *commands,
                   size_t command_count,
                   uint32_t tick_count,
                   SimStepResult *out_result);

uint64_t sim_state_hash(const SimState *state);

#endif
