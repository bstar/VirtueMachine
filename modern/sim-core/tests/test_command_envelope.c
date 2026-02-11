#include "sim_core.h"

#include <stdio.h>
#include <string.h>

static int fail(const char *msg) {
  fprintf(stderr, "FAIL: %s\n", msg);
  return 1;
}

int main(void) {
  SimCommand in = {
      .tick = 42, .type = SIM_CMD_MOVE_REL, .actor_id = 3, .cmd_flags = 0x12, .arg0 = -3, .arg1 = 11};
  SimCommand out = {0};
  SimCommand stream[2];
  uint8_t wire[16];
  uint8_t buf[32];
  size_t count = 0;

  if (sim_command_wire_size() != 16) {
    return fail("unexpected wire size");
  }

  if (sim_command_serialize(&in, wire, sizeof(wire)) != 0) {
    return fail("serialize failed");
  }
  if (sim_command_deserialize(&out, wire, sizeof(wire)) != 0) {
    return fail("deserialize failed");
  }
  if (in.tick != out.tick || in.type != out.type || in.actor_id != out.actor_id ||
      in.cmd_flags != out.cmd_flags || in.arg0 != out.arg0 || in.arg1 != out.arg1) {
    return fail("roundtrip mismatch");
  }

  memcpy(buf, wire, 16);
  in.tick = 99;
  in.type = SIM_CMD_SET_FLAG;
  in.actor_id = 7;
  in.cmd_flags = 0x80;
  in.arg0 = 7;
  in.arg1 = 1;
  if (sim_command_serialize(&in, buf + 16, 16) != 0) {
    return fail("second serialize failed");
  }

  if (sim_command_stream_deserialize(stream, 2, buf, sizeof(buf), &count) != 0) {
    return fail("stream deserialize failed");
  }
  if (count != 2 || stream[0].tick != 42 || stream[1].tick != 99) {
    return fail("stream contents mismatch");
  }
  if (stream[0].actor_id != 3 || stream[0].cmd_flags != 0x12 || stream[1].actor_id != 7 ||
      stream[1].cmd_flags != 0x80) {
    return fail("stream metadata mismatch");
  }

  if (sim_command_stream_deserialize(stream, 2, buf, 31, &count) != -2) {
    return fail("misaligned stream should fail");
  }
  if (sim_command_stream_deserialize(stream, 1, buf, 32, &count) != -3) {
    return fail("capacity overflow should fail");
  }

  puts("PASS: command envelope");
  return 0;
}
