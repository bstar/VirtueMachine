#include "sim_core.h"

#include <inttypes.h>
#include <stdio.h>
#include <string.h>

static int assert_i32_eq(const char *label, int32_t a, int32_t b) {
  if (a != b) {
    fprintf(stderr, "FAIL: %s mismatch: %" PRId32 " != %" PRId32 "\n", label, a, b);
    return 1;
  }
  return 0;
}

static int assert_u32_eq(const char *label, uint32_t a, uint32_t b) {
  if (a != b) {
    fprintf(stderr, "FAIL: %s mismatch: %" PRIu32 " != %" PRIu32 "\n", label, a, b);
    return 1;
  }
  return 0;
}

static int assert_world_eq(const SimWorldState *a, const SimWorldState *b) {
  if (assert_u32_eq("is_on_quest", a->is_on_quest, b->is_on_quest)) return 1;
  if (assert_u32_eq("next_sleep", a->next_sleep, b->next_sleep)) return 1;
  if (assert_u32_eq("time_m", a->time_m, b->time_m)) return 1;
  if (assert_u32_eq("time_h", a->time_h, b->time_h)) return 1;
  if (assert_u32_eq("date_d", a->date_d, b->date_d)) return 1;
  if (assert_u32_eq("date_m", a->date_m, b->date_m)) return 1;
  if (assert_u32_eq("date_y", a->date_y, b->date_y)) return 1;
  if (assert_i32_eq("wind_dir", a->wind_dir, b->wind_dir)) return 1;
  if (assert_u32_eq("active", a->active, b->active)) return 1;
  if (assert_i32_eq("map_x", a->map_x, b->map_x)) return 1;
  if (assert_i32_eq("map_y", a->map_y, b->map_y)) return 1;
  if (assert_i32_eq("map_z", a->map_z, b->map_z)) return 1;
  if (assert_u32_eq("in_combat", a->in_combat, b->in_combat)) return 1;
  if (assert_u32_eq("sound_enabled", a->sound_enabled, b->sound_enabled)) return 1;
  return 0;
}

int main(void) {
  uint8_t blob[32];
  SimWorldState world = {
      .is_on_quest = 1,
      .next_sleep = 3,
      .time_m = 59,
      .time_h = 23,
      .date_d = 27,
      .date_m = 12,
      .date_y = 456,
      .wind_dir = -2,
      .active = 4,
      .map_x = 0x133,
      .map_y = 0x160,
      .map_z = 5,
      .in_combat = 0,
      .sound_enabled = 1,
  };
  SimWorldState restored;
  SimConfig cfg = {.seed = 0xCAFEBABEu, .initial_world = world};
  SimState s1;
  SimState s2;

  memset(blob, 0, sizeof(blob));
  if (sim_world_serialize(&world, blob, sim_world_state_size()) != 0) {
    fprintf(stderr, "FAIL: sim_world_serialize failed\n");
    return 1;
  }
  if (sim_world_deserialize(&restored, blob, sim_world_state_size()) != 0) {
    fprintf(stderr, "FAIL: sim_world_deserialize failed\n");
    return 1;
  }
  if (assert_world_eq(&world, &restored)) {
    return 1;
  }

  if (sim_init(&s1, &cfg) != 0) {
    fprintf(stderr, "FAIL: sim_init s1 failed\n");
    return 1;
  }
  cfg.initial_world = restored;
  if (sim_init(&s2, &cfg) != 0) {
    fprintf(stderr, "FAIL: sim_init s2 failed\n");
    return 1;
  }
  if (sim_state_hash(&s1) != sim_state_hash(&s2)) {
    fprintf(stderr, "FAIL: hash mismatch after serialize/deserialize roundtrip\n");
    return 1;
  }

  restored.map_x += 1;
  cfg.initial_world = restored;
  if (sim_init(&s2, &cfg) != 0) {
    fprintf(stderr, "FAIL: sim_init s2 (mutated) failed\n");
    return 1;
  }
  if (sim_state_hash(&s1) == sim_state_hash(&s2)) {
    fprintf(stderr, "FAIL: hash should change after world field mutation\n");
    return 1;
  }

  printf("PASS: world state io/hash invariants\n");
  return 0;
}
