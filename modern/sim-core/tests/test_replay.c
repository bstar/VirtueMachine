#include "sim_core.h"

#include <inttypes.h>
#include <stdio.h>

static int assert_u64_eq(const char *label, uint64_t a, uint64_t b) {
  if (a != b) {
    fprintf(stderr, "FAIL: %s mismatch: 0x%016" PRIx64 " != 0x%016" PRIx64 "\n", label, a, b);
    return 1;
  }
  return 0;
}

int main(void) {
  const SimConfig cfg = {
      .seed = 0x12345678u,
      .initial_world =
          {
              .is_on_quest = 1,
              .next_sleep = 0,
              .time_m = 12,
              .time_h = 8,
              .date_d = 4,
              .date_m = 7,
              .date_y = 161,
              .wind_dir = 0,
              .active = 0,
              .map_x = 10,
              .map_y = -5,
              .map_z = 0,
              .in_combat = 1,
              .sound_enabled = 1,
          },
  };

  const SimCommand script[] = {
      {.tick = 1, .type = SIM_CMD_MOVE_REL, .arg0 = 2, .arg1 = 0},
      {.tick = 2, .type = SIM_CMD_SET_FLAG, .arg0 = 3, .arg1 = 1},
      {.tick = 3, .type = SIM_CMD_MOVE_REL, .arg0 = -1, .arg1 = 4},
      {.tick = 5, .type = SIM_CMD_RNG_POKE, .arg0 = 0x00FF00FF, .arg1 = 0},
      {.tick = 5, .type = SIM_CMD_SET_FLAG, .arg0 = 1, .arg1 = 1},
      {.tick = 8, .type = SIM_CMD_SET_FLAG, .arg0 = 3, .arg1 = 0},
      {.tick = 10, .type = SIM_CMD_MOVE_REL, .arg0 = 0, .arg1 = -2},
  };

  SimState a;
  SimState b;
  SimStepResult r1;
  SimStepResult r2;
  SimStepResult r3;

  if (sim_init(&a, &cfg) != 0 || sim_init(&b, &cfg) != 0) {
    fprintf(stderr, "FAIL: sim_init failed\n");
    return 1;
  }

  /* Run A in one batch. */
  if (sim_step_ticks(&a, script, sizeof(script) / sizeof(script[0]), 12, &r1) != 0) {
    fprintf(stderr, "FAIL: sim_step_ticks A failed\n");
    return 1;
  }

  /* Run B in two chunks to assert deterministic equivalence. */
  if (sim_step_ticks(&b, script, sizeof(script) / sizeof(script[0]), 5, &r2) != 0) {
    fprintf(stderr, "FAIL: sim_step_ticks B[0] failed\n");
    return 1;
  }
  if (sim_step_ticks(&b, script, sizeof(script) / sizeof(script[0]), 7, &r3) != 0) {
    fprintf(stderr, "FAIL: sim_step_ticks B[1] failed\n");
    return 1;
  }

  if (assert_u64_eq("final hash", r1.state_hash, r3.state_hash)) {
    return 1;
  }
  if (assert_u64_eq("state hash A/B", sim_state_hash(&a), sim_state_hash(&b))) {
    return 1;
  }

  /* Intentional golden value to catch unplanned behavior changes. */
  {
    const uint64_t expected = UINT64_C(0x0a4618d497e0f03c);
    if (assert_u64_eq("golden hash", r1.state_hash, expected)) {
      return 1;
    }
  }

  printf("PASS: replay deterministic hash 0x%016" PRIx64 "\n", r1.state_hash);
  return 0;
}
