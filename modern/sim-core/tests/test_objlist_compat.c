#include "sim_core.h"
#include "u6_objlist.h"

#include <inttypes.h>
#include <stdio.h>
#include <string.h>

static int fail(const char *msg) {
  fprintf(stderr, "FAIL: %s\n", msg);
  return 1;
}

int main(void) {
  uint8_t objlist[U6_OBJLIST_MIN_SIZE];
  SimWorldState w1;
  SimWorldState w2;
  SimConfig cfg = {0};
  SimState s1;
  SimState s2;

  memset(objlist, 0xAA, sizeof(objlist));

  w1.is_on_quest = 1;
  w1.next_sleep = 0;
  w1.time_m = 42;
  w1.time_h = 9;
  w1.date_d = 12;
  w1.date_m = 8;
  w1.date_y = 167;
  w1.wind_dir = -3;
  w1.active = 2;
  w1.map_x = 0x133;
  w1.map_y = 0x160;
  w1.map_z = 1;
  w1.in_combat = 0;
  w1.sound_enabled = 1;

  if (u6_objlist_patch_world(objlist, sizeof(objlist), &w1) != 0) {
    return fail("patch failed");
  }
  if (u6_objlist_extract_world(objlist, sizeof(objlist), &w2) != 0) {
    return fail("extract failed");
  }

  cfg.seed = 0x12345678u;
  cfg.initial_world = w1;
  if (sim_init(&s1, &cfg) != 0) {
    return fail("sim_init s1 failed");
  }

  cfg.initial_world = w2;
  if (sim_init(&s2, &cfg) != 0) {
    return fail("sim_init s2 failed");
  }

  if (sim_state_hash(&s1) != sim_state_hash(&s2)) {
    return fail("hash mismatch after objlist extract/patch roundtrip");
  }

  /* Must reject truncated blobs. */
  if (u6_objlist_extract_world(objlist, U6_OBJLIST_MIN_SIZE - 1, &w2) != -2) {
    return fail("truncated extract should fail with -2");
  }
  if (u6_objlist_patch_world(objlist, U6_OBJLIST_MIN_SIZE - 1, &w2) != -2) {
    return fail("truncated patch should fail with -2");
  }

  /* Mutating mapped fields must change hash. */
  w2.map_x += 1;
  cfg.initial_world = w2;
  if (sim_init(&s2, &cfg) != 0) {
    return fail("sim_init s2 mutate failed");
  }
  if (sim_state_hash(&s1) == sim_state_hash(&s2)) {
    return fail("hash should change when mapped field changes");
  }

  printf("PASS: objlist compatibility boundary\n");
  return 0;
}
