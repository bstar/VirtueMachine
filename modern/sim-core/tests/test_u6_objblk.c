#include "u6_objblk.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

static int fail(const char *msg) {
  fprintf(stderr, "FAIL: %s\n", msg);
  return 1;
}

static void encode_coord(uint8_t out[3], uint16_t x, uint16_t y, uint8_t z) {
  out[0] = (uint8_t)(x & 0xffu);
  out[1] = (uint8_t)(((x >> 8) & 0x03u) | ((y & 0x3fu) << 2));
  out[2] = (uint8_t)(((y >> 6) & 0x0fu) | ((z & 0x0fu) << 4));
}

static void put_u16_le(uint8_t *p, uint16_t v) {
  p[0] = (uint8_t)(v & 0xffu);
  p[1] = (uint8_t)(v >> 8);
}

static int test_parse_records(void) {
  uint8_t blob[2 + (3 * U6_OBJBLK_RECORD_SIZE)];
  U6ObjBlkRecord recs[3];
  size_t count = 0;
  uint8_t c[3];
  uint16_t shape;
  int rc;

  memset(blob, 0, sizeof(blob));
  put_u16_le(blob + 0, 3);

  /* record 0: locxyz */
  blob[2 + 0] = 0x00;
  encode_coord(c, 0x133, 0x160, 0);
  memcpy(blob + 2 + 1, c, 3);
  shape = (uint16_t)(0x12au + (2u << 10));
  put_u16_le(blob + 2 + 4, shape);
  put_u16_le(blob + 2 + 6, 0x0011);

  /* record 1: contained */
  blob[10 + 0] = 0x08;
  encode_coord(c, 0x111, 0x122, 1);
  memcpy(blob + 10 + 1, c, 3);
  put_u16_le(blob + 10 + 4, (uint16_t)(0x0eau + (1u << 10)));
  put_u16_le(blob + 10 + 6, 0x0042);

  /* record 2: locxyz */
  blob[18 + 0] = 0x00;
  encode_coord(c, 0x1ff, 0x2aa, 3);
  memcpy(blob + 18 + 1, c, 3);
  put_u16_le(blob + 18 + 4, (uint16_t)(0x0edu + (3u << 10)));
  put_u16_le(blob + 18 + 6, 0x0001);

  rc = u6_objblk_parse_records(blob, sizeof(blob), recs, 3, &count);
  if (rc != 0 || count != 3) {
    return fail("parse count mismatch");
  }

  if (recs[0].x != 0x133 || recs[0].y != 0x160 || recs[0].z != 0) {
    return fail("coord decode mismatch record 0");
  }
  if (recs[0].obj_type != 0x12a || recs[0].obj_frame != 2) {
    return fail("shape decode mismatch record 0");
  }
  if (!u6_objblk_is_locxyz(recs[0].status) || u6_objblk_is_locxyz(recs[1].status)) {
    return fail("coord use decode mismatch");
  }
  if (recs[2].x != 0x1ff || recs[2].y != 0x2aa || recs[2].z != 3) {
    return fail("coord decode mismatch record 2");
  }

  return 0;
}

static int write_objblk(const char *path, const uint8_t *buf, size_t n) {
  FILE *fp = fopen(path, "wb");
  if (fp == NULL) {
    return -1;
  }
  if (fwrite(buf, 1, n, fp) != n) {
    fclose(fp);
    return -1;
  }
  fclose(fp);
  return 0;
}

static int test_load_outdoor(void) {
  char dir[512];
  char path_aa[512];
  char path_ba[512];
  uint8_t aa[2 + (2 * U6_OBJBLK_RECORD_SIZE)];
  uint8_t ba[2 + U6_OBJBLK_RECORD_SIZE];
  U6ObjBlkRecord recs[8];
  size_t count = 0;
  size_t files_loaded = 0;
  uint8_t c[3];
  int rc;

  snprintf(dir, sizeof(dir), "/tmp/u6m_objblk_test_%ld_%ld", (long)getpid(), (long)time(NULL));
  if (mkdir(dir, 0700) != 0) {
    return fail("mkdir fixture dir failed");
  }

  snprintf(path_aa, sizeof(path_aa), "%s/objblkaa", dir);
  snprintf(path_ba, sizeof(path_ba), "%s/objblkba", dir);

  memset(aa, 0, sizeof(aa));
  put_u16_le(aa + 0, 2);
  aa[2 + 0] = 0x00;
  encode_coord(c, 10, 20, 0);
  memcpy(aa + 2 + 1, c, 3);
  put_u16_le(aa + 2 + 4, (uint16_t)(0x129u + (1u << 10)));
  put_u16_le(aa + 2 + 6, 0x0001);
  aa[10 + 0] = 0x08;
  encode_coord(c, 11, 20, 0);
  memcpy(aa + 10 + 1, c, 3);
  put_u16_le(aa + 10 + 4, (uint16_t)(0x12au + (0u << 10)));
  put_u16_le(aa + 10 + 6, 0x0001);

  memset(ba, 0, sizeof(ba));
  put_u16_le(ba + 0, 1);
  ba[2 + 0] = 0x00;
  encode_coord(c, 30, 40, 0);
  memcpy(ba + 2 + 1, c, 3);
  put_u16_le(ba + 2 + 4, (uint16_t)(0x0eau + (0u << 10)));
  put_u16_le(ba + 2 + 6, 0x0001);

  if (write_objblk(path_aa, aa, sizeof(aa)) != 0 || write_objblk(path_ba, ba, sizeof(ba)) != 0) {
    return fail("write fixture objblk failed");
  }

  rc = u6_objblk_load_outdoor_savegame(dir, recs, 8, &count, &files_loaded);
  if (rc != 0) {
    return fail("load_outdoor_savegame failed");
  }
  if (files_loaded != 2 || count != 2) {
    return fail("unexpected files/record count");
  }
  {
    int seen_area0 = 0;
    int seen_area1 = 0;
    int seen_x10 = 0;
    int seen_x30 = 0;
    for (size_t i = 0; i < count; i++) {
      if (recs[i].source_area == 0) seen_area0 = 1;
      if (recs[i].source_area == 1) seen_area1 = 1;
      if (recs[i].x == 10) seen_x10 = 1;
      if (recs[i].x == 30) seen_x30 = 1;
    }
    if (!seen_area0 || !seen_area1) {
      return fail("source area mapping mismatch");
    }
    if (!seen_x10 || !seen_x30) {
      return fail("loaded coord mismatch");
    }
  }

  remove(path_aa);
  remove(path_ba);
  rmdir(dir);
  return 0;
}

static int test_render_sort(void) {
  U6ObjBlkRecord recs[4];

  memset(recs, 0, sizeof(recs));
  recs[0].x = 20;
  recs[0].y = 40;
  recs[0].z = 0;
  recs[0].source_area = 1;
  recs[0].source_index = 5;

  recs[1].x = 10;
  recs[1].y = 40;
  recs[1].z = 0;
  recs[1].source_area = 0;
  recs[1].source_index = 1;

  recs[2].x = 10;
  recs[2].y = 39;
  recs[2].z = 0;
  recs[2].source_area = 0;
  recs[2].source_index = 0;

  recs[3].x = 10;
  recs[3].y = 40;
  recs[3].z = 1;
  recs[3].source_area = 0;
  recs[3].source_index = 2;

  u6_objblk_sort_for_render(recs, 4);

  if (recs[0].y != 39 || recs[0].x != 10) {
    return fail("sort y/x order mismatch");
  }
  if (!(recs[1].x == 10 && recs[1].y == 40 && recs[1].z == 1)) {
    return fail("sort z order mismatch");
  }
  if (!(recs[2].x == 10 && recs[2].y == 40 && recs[2].z == 0)) {
    return fail("sort second tie order mismatch");
  }
  if (!(recs[3].x == 20 && recs[3].y == 40)) {
    return fail("sort final position mismatch");
  }

  return 0;
}

int main(void) {
  int rc;

  rc = test_parse_records();
  if (rc != 0) {
    return rc;
  }

  rc = test_load_outdoor();
  if (rc != 0) {
    return rc;
  }

  rc = test_render_sort();
  if (rc != 0) {
    return rc;
  }

  puts("PASS: u6 objblk");
  return 0;
}
