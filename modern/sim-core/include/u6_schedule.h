#ifndef U6M_U6_SCHEDULE_H
#define U6M_U6_SCHEDULE_H

#include <stddef.h>
#include <stdint.h>

enum {
  U6M_SCHEDULE_NPC_COUNT = 256,
  U6M_SCHEDULE_POINTER_COUNT = U6M_SCHEDULE_NPC_COUNT + 1,
  U6M_SCHEDULE_ENTRY_SIZE = 5,
  U6M_SCHEDULE_MAX_ENTRIES = 600
};

typedef struct U6ScheduleEntry {
  uint8_t time;
  uint8_t action;
  uint32_t xyz_raw;
} U6ScheduleEntry;

typedef struct U6ScheduleTable {
  uint16_t npc_offsets[U6M_SCHEDULE_POINTER_COUNT];
  uint16_t entry_count;
  U6ScheduleEntry entries[U6M_SCHEDULE_MAX_ENTRIES];
} U6ScheduleTable;

int u6_schedule_parse(const uint8_t *bytes, size_t size, U6ScheduleTable *out_table);
int u6_schedule_select(const U6ScheduleTable *table,
                       uint16_t npc_id,
                       uint8_t hour,
                       uint8_t date_d,
                       uint16_t *out_sched_index,
                       U6ScheduleEntry *out_entry);

#endif
