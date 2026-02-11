#include "sim_core.h"

#include <stdio.h>
#include <string.h>

static int fail(const char *msg) {
  fprintf(stderr, "FAIL: %s\n", msg);
  return 1;
}

static int read_file(const char *path, char *out, size_t cap, size_t *out_n) {
  FILE *fp = fopen(path, "rb");
  size_t n;
  if (!fp) return -1;
  n = fread(out, 1, cap, fp);
  fclose(fp);
  *out_n = n;
  return 0;
}

int main(void) {
  SimConfig cfg = {0};
  SimState s0 = {0};
  SimCommand cmds[3];
  char a[512];
  char b[512];
  size_t an = 0;
  size_t bn = 0;

  cfg.seed = 0x1234u;
  cfg.initial_world.time_m = 12;
  cfg.initial_world.time_h = 8;
  cfg.initial_world.date_d = 4;
  cfg.initial_world.date_m = 7;
  cfg.initial_world.date_y = 161;
  cfg.initial_world.map_x = 0x133;
  cfg.initial_world.map_y = 0x160;
  cfg.initial_world.sound_enabled = 1;

  if (sim_init(&s0, &cfg) != 0) return fail("sim_init failed");

  cmds[0].tick = 2;
  cmds[0].type = SIM_CMD_MOVE_REL;
  cmds[0].arg0 = 1;
  cmds[0].arg1 = 0;
  cmds[1].tick = 3;
  cmds[1].type = SIM_CMD_SET_FLAG;
  cmds[1].arg0 = 5;
  cmds[1].arg1 = 1;
  cmds[2].tick = 9;
  cmds[2].type = SIM_CMD_RNG_POKE;
  cmds[2].arg0 = 0x55AA55AA;
  cmds[2].arg1 = 0;

  if (sim_write_replay_checkpoints(&s0, cmds, 3, 20, 5, "chk_a.csv") != 0) {
    return fail("write checkpoints A failed");
  }
  if (sim_write_replay_checkpoints(&s0, cmds, 3, 20, 5, "chk_b.csv") != 0) {
    return fail("write checkpoints B failed");
  }

  if (read_file("chk_a.csv", a, sizeof(a), &an) != 0 || read_file("chk_b.csv", b, sizeof(b), &bn) != 0) {
    return fail("read checkpoints failed");
  }
  if (an != bn || memcmp(a, b, an) != 0) {
    return fail("checkpoint logs should be deterministic and identical");
  }
  if (strstr(a, "tick,hash\n") != a) {
    return fail("checkpoint header missing");
  }

  if (sim_write_replay_checkpoints(&s0, cmds, 3, 20, 0, "chk_bad.csv") != -1) {
    return fail("zero interval should fail");
  }

  puts("PASS: replay checkpoints");
  return 0;
}
