#ifndef U6M_U6_OBJBLK_H
#define U6M_U6_OBJBLK_H

#include <stddef.h>
#include <stdint.h>

#define U6_OBJBLK_MAX_RECORDS 0x0c00u
#define U6_OBJBLK_RECORD_SIZE 8u

typedef struct U6ObjBlkRecord {
  uint8_t status;
  uint16_t x;
  uint16_t y;
  uint8_t z;
  uint16_t shape_type;
  uint16_t amount;
  uint16_t obj_type;
  uint16_t obj_frame;
  uint16_t source_area;
  uint16_t source_index;
} U6ObjBlkRecord;

int u6_objblk_is_locxyz(uint8_t status);
uint16_t u6_objblk_shape_type_get_type(uint16_t shape_type);
uint16_t u6_objblk_shape_type_get_frame(uint16_t shape_type);

int u6_objblk_parse_records(const uint8_t *bytes,
                            size_t bytes_size,
                            U6ObjBlkRecord *out_records,
                            size_t out_capacity,
                            size_t *out_count);

int u6_objblk_load_outdoor_savegame(const char *savegame_dir,
                                    U6ObjBlkRecord *out_records,
                                    size_t out_capacity,
                                    size_t *out_count,
                                    size_t *out_files_loaded);

void u6_objblk_sort_for_render(U6ObjBlkRecord *records, size_t count);

#endif
