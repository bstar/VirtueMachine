#include "sim_core.h"

#include <inttypes.h>
#include <stdio.h>
#include <string.h>

static int fail(const char *msg) {
  fprintf(stderr, "FAIL: %s\n", msg);
  return 1;
}

int main(void) {
  SimConfig cfg = {0};
  SimState s1 = {0};
  SimState s2 = {0};
  uint8_t buf[128];
  size_t n;

  cfg.seed = 0xA55AA55Au;
  cfg.initial_world.is_on_quest = 1;
  cfg.initial_world.time_m = 58;
  cfg.initial_world.time_h = 23;
  cfg.initial_world.date_d = 28;
  cfg.initial_world.date_m = 13;
  cfg.initial_world.date_y = 700;
  cfg.initial_world.map_x = 0x133;
  cfg.initial_world.map_y = 0x160;
  cfg.initial_world.map_z = 0;
  cfg.initial_world.in_combat = 1;
  cfg.initial_world.sound_enabled = 1;

  if (sim_init(&s1, &cfg) != 0) return fail("sim_init");
  if (sim_step_ticks(&s1, NULL, 0, 17, NULL) != 0) return fail("sim_step_ticks");

  n = sim_state_snapshot_size();
  if (n > sizeof(buf)) return fail("snapshot size too large for test buffer");

  if (sim_state_snapshot_serialize(&s1, buf, n) != SIM_PERSIST_OK) {
    return fail("snapshot serialize failed");
  }
  if (sim_state_snapshot_deserialize(&s2, buf, n) != SIM_PERSIST_OK) {
    return fail("snapshot deserialize failed");
  }
  if (sim_state_hash(&s1) != sim_state_hash(&s2)) {
    return fail("state hash mismatch after snapshot roundtrip");
  }

  if (sim_state_snapshot_serialize(&s1, buf, n - 1) != SIM_PERSIST_ERR_SIZE) {
    return fail("short serialize buffer should fail");
  }
  if (sim_state_snapshot_deserialize(&s2, buf, n - 1) != SIM_PERSIST_ERR_SIZE) {
    return fail("short deserialize buffer should fail");
  }

  /* Bad magic */
  buf[0] ^= 0xFFu;
  if (sim_state_snapshot_deserialize(&s2, buf, n) != SIM_PERSIST_ERR_MAGIC) {
    return fail("bad magic should fail");
  }
  buf[0] ^= 0xFFu;

  /* Bad version */
  buf[4] ^= 0x01u;
  if (sim_state_snapshot_deserialize(&s2, buf, n) != SIM_PERSIST_ERR_VERSION) {
    return fail("bad version should fail");
  }
  buf[4] ^= 0x01u;

  /* Bad checksum */
  buf[n - 1] ^= 0x80u;
  if (sim_state_snapshot_deserialize(&s2, buf, n) != SIM_PERSIST_ERR_CHECKSUM) {
    return fail("bad checksum should fail");
  }
  buf[n - 1] ^= 0x80u;

  puts("PASS: snapshot persistence + failure paths");
  return 0;
}
