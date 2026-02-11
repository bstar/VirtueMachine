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
  struct SimWorldState {
    uint8_t is_on_quest;
    uint8_t next_sleep;
    uint8_t time_m;
    uint8_t time_h;
    uint8_t date_d;
    uint8_t date_m;
    uint16_t date_y;
    int16_t wind_dir;
    uint8_t active;
    int32_t map_x;
    int32_t map_y;
    int16_t map_z;
    uint8_t in_combat;
    uint8_t sound_enabled;
  } initial_world;
} SimConfig;

typedef struct SimWorldState SimWorldState;

typedef struct SimCommand {
  uint32_t tick;
  SimCommandType type;
  int32_t arg0;
  int32_t arg1;
} SimCommand;

typedef struct SimState {
  uint32_t tick;
  uint32_t rng_state;
  uint32_t world_flags;
  uint32_t commands_applied;
  SimWorldState world;
} SimState;

typedef struct SimStepResult {
  uint32_t ticks_advanced;
  uint32_t commands_applied;
  uint64_t state_hash;
} SimStepResult;

typedef enum SimPersistError {
  SIM_PERSIST_OK = 0,
  SIM_PERSIST_ERR_NULL = -1,
  SIM_PERSIST_ERR_SIZE = -2,
  SIM_PERSIST_ERR_MAGIC = -3,
  SIM_PERSIST_ERR_VERSION = -4,
  SIM_PERSIST_ERR_CHECKSUM = -5
} SimPersistError;

int sim_init(SimState *state, const SimConfig *cfg);

int sim_step_ticks(SimState *state,
                   const SimCommand *commands,
                   size_t command_count,
                   uint32_t tick_count,
                   SimStepResult *out_result);

uint64_t sim_state_hash(const SimState *state);

size_t sim_world_state_size(void);
int sim_world_serialize(const SimWorldState *world, uint8_t *out, size_t out_size);
int sim_world_deserialize(SimWorldState *world, const uint8_t *in, size_t in_size);

size_t sim_state_snapshot_size(void);
int sim_state_snapshot_serialize(const SimState *state, uint8_t *out, size_t out_size);
int sim_state_snapshot_deserialize(SimState *state, const uint8_t *in, size_t in_size);

#endif
