#include "sim_core.h"

#include <stdio.h>

static int fail(const char *msg) {
  fprintf(stderr, "FAIL: %s\n", msg);
  return 1;
}

int main(void) {
  SimConfig cfg = {0};
  SimState s = {0};

  cfg.seed = 0xDEADBEEFu;
  cfg.initial_world.time_m = 59;
  cfg.initial_world.time_h = 23;
  cfg.initial_world.date_d = 28;
  cfg.initial_world.date_m = 13;
  cfg.initial_world.date_y = 1000;
  cfg.initial_world.map_x = 0x133;
  cfg.initial_world.map_y = 0x160;
  cfg.initial_world.map_z = 0;
  cfg.initial_world.in_combat = 1;
  cfg.initial_world.sound_enabled = 1;

  if (sim_init(&s, &cfg) != 0) {
    return fail("sim_init failed");
  }

  /* 4 ticks = 1 minute. This should roll minute/hour/day/month/year. */
  if (sim_step_ticks(&s, NULL, 0, 4, NULL) != 0) {
    return fail("sim_step_ticks failed");
  }

  if (s.world.time_m != 0) return fail("minute rollover failed");
  if (s.world.time_h != 0) return fail("hour rollover failed");
  if (s.world.date_d != 1) return fail("day rollover failed");
  if (s.world.date_m != 1) return fail("month rollover failed");
  if (s.world.date_y != 1001) return fail("year rollover failed");

  /* Another 8 ticks = +2 minutes */
  if (sim_step_ticks(&s, NULL, 0, 8, NULL) != 0) {
    return fail("second sim_step_ticks failed");
  }
  if (s.world.time_m != 2) return fail("minute progression failed");

  puts("PASS: deterministic clock rollover");
  return 0;
}
