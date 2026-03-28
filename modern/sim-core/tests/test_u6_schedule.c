#include "u6_schedule.h"

#include <stdio.h>
#include <string.h>

static int fail(const char *msg) {
  fprintf(stderr, "FAIL: %s\n", msg);
  return 1;
}

static void write_u16_le(uint8_t *p, uint16_t v) {
  p[0] = (uint8_t)(v & 0xffu);
  p[1] = (uint8_t)((v >> 8) & 0xffu);
}

int main(void) {
  uint8_t blob[(U6M_SCHEDULE_POINTER_COUNT * 2u) + (3u * U6M_SCHEDULE_ENTRY_SIZE)];
  U6ScheduleTable table;
  U6ScheduleEntry entry;
  uint16_t idx = 0;
  int rc;

  memset(blob, 0, sizeof(blob));
  write_u16_le(blob + (5u * 2u), 0u);
  write_u16_le(blob + (6u * 2u), 3u);
  write_u16_le(blob + (U6M_SCHEDULE_NPC_COUNT * 2u), 3u);

  blob[U6M_SCHEDULE_POINTER_COUNT * 2u + 0] = 8u;
  blob[U6M_SCHEDULE_POINTER_COUNT * 2u + 1] = 0x8bu;
  blob[U6M_SCHEDULE_POINTER_COUNT * 2u + 5] = (uint8_t)(8u | (2u << 5));
  blob[U6M_SCHEDULE_POINTER_COUNT * 2u + 6] = 0x92u;
  blob[U6M_SCHEDULE_POINTER_COUNT * 2u + 10] = 9u;
  blob[U6M_SCHEDULE_POINTER_COUNT * 2u + 11] = 0x91u;

  rc = u6_schedule_parse(blob, sizeof(blob), &table);
  if (rc != 0) {
    return fail("u6_schedule_parse failed");
  }
  if (table.entry_count != 3u) {
    return fail("entry_count mismatch");
  }

  rc = u6_schedule_select(&table, 5u, 8u, 2u, &idx, &entry);
  if (rc != 0) {
    return fail("weekday-matched selection failed");
  }
  if (idx != 1u || entry.action != 0x92u) {
    return fail("weekday-specific selection mismatch");
  }

  rc = u6_schedule_select(&table, 5u, 8u, 1u, &idx, &entry);
  if (rc != 0) {
    return fail("fallback day-zero selection failed");
  }
  if (idx != 0u || entry.action != 0x8bu) {
    return fail("fallback selection mismatch");
  }

  rc = u6_schedule_select(&table, 6u, 8u, 1u, &idx, &entry);
  if (rc == 0) {
    return fail("unexpected selection for empty npc range");
  }

  puts("test_u6_schedule: ok");
  return 0;
}
