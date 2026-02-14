#include "u6_objblk.h"
#include "u6_objstatus.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define U6_OBJ_STATUS_0010 0x10u

static uint16_t read_u16_le(const uint8_t *p) {
  return (uint16_t)p[0] | ((uint16_t)p[1] << 8);
}

static void decode_coord(const uint8_t *p, uint16_t *out_x, uint16_t *out_y, uint8_t *out_z) {
  *out_x = (uint16_t)p[0] | (uint16_t)((p[1] & 0x03u) << 8);
  *out_y = (uint16_t)(p[1] >> 2) | (uint16_t)((p[2] & 0x0fu) << 6);
  *out_z = (uint8_t)((p[2] >> 4) & 0x0fu);
}

int u6_objblk_is_locxyz(uint8_t status) {
  return u6_obj_status_is_locxyz(status);
}

static uint8_t coord_use(uint8_t status) {
  return u6_obj_status_coord_use(status);
}

static int is_status_0010(uint8_t status) {
  return (status & U6_OBJ_STATUS_0010) != 0;
}

uint16_t u6_objblk_shape_type_get_type(uint16_t shape_type) {
  return (uint16_t)(shape_type & 0x03ffu);
}

uint16_t u6_objblk_shape_type_get_frame(uint16_t shape_type) {
  return (uint16_t)(shape_type >> 10);
}

int u6_objblk_parse_records(const uint8_t *bytes,
                            size_t bytes_size,
                            U6ObjBlkRecord *out_records,
                            size_t out_capacity,
                            size_t *out_count) {
  uint16_t file_count;
  size_t max_by_size;
  size_t n;

  if (bytes == NULL || out_count == NULL) {
    return -1;
  }
  if (out_records == NULL && out_capacity > 0) {
    return -1;
  }
  if (bytes_size < 2) {
    return -2;
  }

  file_count = read_u16_le(bytes);
  if (file_count > U6_OBJBLK_MAX_RECORDS) {
    file_count = U6_OBJBLK_MAX_RECORDS;
  }
  max_by_size = (bytes_size - 2) / U6_OBJBLK_RECORD_SIZE;
  n = file_count;
  if (n > max_by_size) {
    n = max_by_size;
  }
  if (n > out_capacity) {
    return -3;
  }

  for (size_t i = 0; i < n; i++) {
    const uint8_t *rec = bytes + 2 + (i * U6_OBJBLK_RECORD_SIZE);
    U6ObjBlkRecord *out = &out_records[i];
    uint16_t shape_type = read_u16_le(rec + 4);

    out->status = rec[0];
    decode_coord(rec + 1, &out->x, &out->y, &out->z);
    out->shape_type = shape_type;
    out->amount = read_u16_le(rec + 6);
    out->obj_type = u6_objblk_shape_type_get_type(shape_type);
    out->obj_frame = u6_objblk_shape_type_get_frame(shape_type);
    out->source_area = 0;
    out->source_index = (uint16_t)i;
  }

  *out_count = n;
  return 0;
}

static int load_one_objblk(const char *path,
                           uint16_t area_id,
                           U6ObjBlkRecord *out_records,
                           size_t out_capacity,
                           size_t *io_count,
                           int *out_loaded_file) {
  FILE *fp;
  long szl;
  size_t sz;
  uint8_t *buf;
  size_t parsed = 0;
  int rc;

  *out_loaded_file = 0;
  fp = fopen(path, "rb");
  if (fp == NULL) {
    return 0;
  }

  if (fseek(fp, 0, SEEK_END) != 0) {
    fclose(fp);
    return -2;
  }
  szl = ftell(fp);
  if (szl < 0) {
    fclose(fp);
    return -2;
  }
  if (fseek(fp, 0, SEEK_SET) != 0) {
    fclose(fp);
    return -2;
  }

  sz = (size_t)szl;
  buf = (uint8_t *)malloc(sz > 0 ? sz : 1);
  if (buf == NULL) {
    fclose(fp);
    return -4;
  }
  if (sz > 0 && fread(buf, 1, sz, fp) != sz) {
    free(buf);
    fclose(fp);
    return -2;
  }
  fclose(fp);
  *out_loaded_file = 1;

  {
    U6ObjBlkRecord tmp[U6_OBJBLK_MAX_RECORDS];
    size_t tmp_count = 0;
    rc = u6_objblk_parse_records(buf, sz, tmp, U6_OBJBLK_MAX_RECORDS, &tmp_count);
    free(buf);
    if (rc != 0) {
      return rc;
    }
    for (size_t i = 0; i < tmp_count; i++) {
      if (!u6_objblk_is_locxyz(tmp[i].status)) {
        continue;
      }
      if (*io_count >= out_capacity) {
        return -3;
      }
      out_records[*io_count] = tmp[i];
      out_records[*io_count].source_area = area_id;
      out_records[*io_count].source_index = (uint16_t)i;
      (*io_count)++;
      parsed++;
    }
  }

  (void)parsed;
  return 0;
}

int u6_objblk_load_outdoor_savegame(const char *savegame_dir,
                                    U6ObjBlkRecord *out_records,
                                    size_t out_capacity,
                                    size_t *out_count,
                                    size_t *out_files_loaded) {
  size_t count = 0;
  size_t files_loaded = 0;
  char path[512];

  if (savegame_dir == NULL || out_count == NULL || out_files_loaded == NULL) {
    return -1;
  }
  if (out_records == NULL && out_capacity > 0) {
    return -1;
  }

  for (int ay = 0; ay < 8; ay++) {
    for (int ax = 0; ax < 8; ax++) {
      uint16_t area_id = (uint16_t)((ay << 3) | ax);
      int loaded_file = 0;
      int rc;
      snprintf(path, sizeof(path), "%s/objblk%c%c", savegame_dir, (char)('a' + ax), (char)('a' + ay));
      rc = load_one_objblk(path, area_id, out_records, out_capacity, &count, &loaded_file);
      if (rc != 0) {
        return rc;
      }
      if (loaded_file) {
        files_loaded++;
      }
    }
  }

  *out_count = count;
  *out_files_loaded = files_loaded;
  return 0;
}

static int compare_render_order(const void *lhs, const void *rhs) {
  const U6ObjBlkRecord *a = (const U6ObjBlkRecord *)lhs;
  const U6ObjBlkRecord *b = (const U6ObjBlkRecord *)rhs;
  uint8_t a_use = coord_use(a->status);
  uint8_t b_use = coord_use(b->status);

  /*
   * Legacy comparator relation (C_1184_29C4): non-LOCXYZ chains compare
   * ahead of LOCXYZ roots in mixed comparisons.
   */
  if (a_use != U6_OBJ_COORD_USE_LOCXYZ && b_use == U6_OBJ_COORD_USE_LOCXYZ) {
    return -1;
  }
  if (b_use != U6_OBJ_COORD_USE_LOCXYZ && a_use == U6_OBJ_COORD_USE_LOCXYZ) {
    return 1;
  }
  if (a->y != b->y) {
    return (a->y < b->y) ? -1 : 1;
  }
  if (a->x != b->x) {
    return (a->x < b->x) ? -1 : 1;
  }
  if (a->z != b->z) {
    return (a->z > b->z) ? -1 : 1;
  }
  /*
   * Assoc-chain detail (Is_0010/GetAssoc) is not represented in this flat
   * record shape yet; preserve deterministic ordering for exact ties.
   */
  if (is_status_0010(a->status) != is_status_0010(b->status)) {
    return is_status_0010(a->status) ? -1 : 1;
  }
  if (a->source_area != b->source_area) {
    return (a->source_area < b->source_area) ? -1 : 1;
  }
  if (a->source_index != b->source_index) {
    return (a->source_index < b->source_index) ? -1 : 1;
  }
  return 0;
}

void u6_objblk_sort_for_render(U6ObjBlkRecord *records, size_t count) {
  if (records == NULL || count < 2) {
    return;
  }
  qsort(records, count, sizeof(U6ObjBlkRecord), compare_render_order);
}
