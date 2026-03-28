#include "u6_schedule.h"

#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
  FILE *fp;
  long size_long;
  size_t size;
  uint8_t *buf;
  U6ScheduleTable table;
  U6ScheduleEntry entry;
  uint16_t sched_index = 0;
  int rc;
  int npc_id;
  int hour;
  int date_d;

  if (argc != 5) {
    fprintf(stderr, "usage: %s <schedule_path> <npc_id> <hour> <date_d>\n", argv[0]);
    return 2;
  }

  npc_id = (int)strtol(argv[2], NULL, 0);
  hour = (int)strtol(argv[3], NULL, 0);
  date_d = (int)strtol(argv[4], NULL, 0);

  fp = fopen(argv[1], "rb");
  if (fp == NULL) {
    fprintf(stderr, "failed to open schedule asset\n");
    return 2;
  }
  if (fseek(fp, 0, SEEK_END) != 0) {
    fclose(fp);
    fprintf(stderr, "failed to seek schedule asset\n");
    return 2;
  }
  size_long = ftell(fp);
  if (size_long < 0) {
    fclose(fp);
    fprintf(stderr, "failed to determine schedule asset size\n");
    return 2;
  }
  if (fseek(fp, 0, SEEK_SET) != 0) {
    fclose(fp);
    fprintf(stderr, "failed to rewind schedule asset\n");
    return 2;
  }
  size = (size_t)size_long;
  buf = (uint8_t *)malloc(size);
  if (buf == NULL) {
    fclose(fp);
    fprintf(stderr, "allocation failure\n");
    return 2;
  }
  if (fread(buf, 1, size, fp) != size) {
    free(buf);
    fclose(fp);
    fprintf(stderr, "failed to read schedule asset\n");
    return 2;
  }
  fclose(fp);

  rc = u6_schedule_parse(buf, size, &table);
  free(buf);
  if (rc != 0) {
    fprintf(stderr, "schedule parse failed: %d\n", rc);
    return 2;
  }

  rc = u6_schedule_select(&table, (uint16_t)npc_id, (uint8_t)hour, (uint8_t)date_d, &sched_index, &entry);
  if (rc != 0) {
    printf("status=none\n");
    return 0;
  }

  printf("status=ok sched_index=%u action=%u xyz_raw=%u\n",
         (unsigned)sched_index,
         (unsigned)entry.action,
         (unsigned)entry.xyz_raw);
  return 0;
}
