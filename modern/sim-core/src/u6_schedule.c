#include "u6_schedule.h"

#include <string.h>

static uint16_t read_u16_le(const uint8_t *p) {
  return (uint16_t)((uint16_t)p[0] | ((uint16_t)p[1] << 8));
}

static uint8_t schedule_weekday(uint8_t date_d) {
  int v = ((int)date_d - 1) % 7;
  if (v < 0) {
    v += 7;
  }
  return (uint8_t)(v + 1);
}

int u6_schedule_parse(const uint8_t *bytes, size_t size, U6ScheduleTable *out_table) {
  size_t base_off;
  uint16_t entry_count;
  uint16_t i;

  if (bytes == NULL || out_table == NULL) {
    return -1;
  }
  if (size < (U6M_SCHEDULE_POINTER_COUNT * 2u)) {
    return -2;
  }

  memset(out_table, 0, sizeof(*out_table));
  for (i = 0; i < U6M_SCHEDULE_POINTER_COUNT; i++) {
    out_table->npc_offsets[i] = read_u16_le(bytes + (i * 2u));
  }

  entry_count = out_table->npc_offsets[U6M_SCHEDULE_NPC_COUNT];
  if (entry_count > U6M_SCHEDULE_MAX_ENTRIES) {
    return -3;
  }

  base_off = U6M_SCHEDULE_POINTER_COUNT * 2u;
  if (size < (base_off + ((size_t)entry_count * U6M_SCHEDULE_ENTRY_SIZE))) {
    return -4;
  }

  out_table->entry_count = entry_count;
  for (i = 0; i < entry_count; i++) {
    size_t off = base_off + ((size_t)i * U6M_SCHEDULE_ENTRY_SIZE);
    out_table->entries[i].time = bytes[off + 0];
    out_table->entries[i].action = bytes[off + 1];
    out_table->entries[i].xyz_raw = (uint32_t)bytes[off + 2]
      | ((uint32_t)bytes[off + 3] << 8)
      | ((uint32_t)bytes[off + 4] << 16);
  }
  return 0;
}

int u6_schedule_select(const U6ScheduleTable *table,
                       uint16_t npc_id,
                       uint8_t hour,
                       uint8_t date_d,
                       uint16_t *out_sched_index,
                       U6ScheduleEntry *out_entry) {
  uint16_t start;
  uint16_t end;
  int idx;
  uint8_t weekday;

  if (table == NULL || npc_id >= U6M_SCHEDULE_NPC_COUNT) {
    return -1;
  }

  start = table->npc_offsets[npc_id];
  end = table->npc_offsets[npc_id + 1];
  if (end <= start || end > table->entry_count) {
    return -2;
  }

  weekday = schedule_weekday(date_d);
  for (idx = (int)end - 1; idx >= (int)start; idx--) {
    const U6ScheduleEntry *entry = &table->entries[idx];
    uint8_t entry_hour = (uint8_t)(entry->time & 0x1f);
    uint8_t day_mask = (uint8_t)((entry->time >> 5) & 0x07);
    if (entry_hour != (hour & 0x1f)) {
      continue;
    }
    if (day_mask != 0u && day_mask != weekday) {
      continue;
    }
    if (out_sched_index != NULL) {
      *out_sched_index = (uint16_t)(idx - (int)start);
    }
    if (out_entry != NULL) {
      *out_entry = *entry;
    }
    return 0;
  }

  return -3;
}
