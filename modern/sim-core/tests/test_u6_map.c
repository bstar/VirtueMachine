#include "u6_map.h"

#include <stdint.h>
#include <stdio.h>
#include <string.h>

static int fail(const char *msg) {
  fprintf(stderr, "FAIL: %s\n", msg);
  return 1;
}

static int write_file(const char *path, const uint8_t *data, size_t len) {
  FILE *fp = fopen(path, "wb");
  if (!fp) return -1;
  if (fwrite(data, 1, len, fp) != len) {
    fclose(fp);
    return -2;
  }
  fclose(fp);
  return 0;
}

static void set_entry12(uint8_t *base, int si, int high, uint16_t val) {
  val &= 0x0fff;
  if (!high) {
    base[si] = (uint8_t)(val & 0xff);
    base[si + 1] = (uint8_t)((base[si + 1] & 0xf0) | ((val >> 8) & 0x0f));
  } else {
    base[si] = (uint8_t)((base[si] & 0x0f) | ((val << 4) & 0xf0));
    base[si + 1] = (uint8_t)((val >> 4) & 0xff);
  }
}

int main(void) {
  /* Minimal synthetic fixtures. */
  uint8_t map_data[0x1000];
  uint8_t chunks_data[0x200];
  U6MapContext ctx;
  int chunk_idx;
  uint8_t tile;
  uint8_t chunk[0x40];

  memset(map_data, 0, sizeof(map_data));
  memset(chunks_data, 0, sizeof(chunks_data));

  /*
   * Encode chunk indices in block 0:
   * x=0,y=0  -> si=0 low12  -> chunk 5
   * x=8,y=0  -> si=1 high12 -> chunk 7
   */
  set_entry12(map_data + 0x000, 0, 0, 5);
  set_entry12(map_data + 0x000, 1, 1, 7);

  /* chunk 5 tile pattern and chunk 7 tile pattern */
  for (int i = 0; i < 0x40; i++) {
    chunks_data[(5 * 0x40) + i] = (uint8_t)(0x50 + i);
    chunks_data[(7 * 0x40) + i] = (uint8_t)(0x70 + i);
  }

  if (write_file("test_map.bin", map_data, sizeof(map_data)) != 0) return fail("write map fixture");
  if (write_file("test_chunks.bin", chunks_data, sizeof(chunks_data)) != 0) return fail("write chunks fixture");

  if (u6_map_open(&ctx, "test_map.bin", "test_chunks.bin") != 0) {
    return fail("u6_map_open");
  }

  if (u6_map_get_chunk_index_at(&ctx, 0, 0, 0, &chunk_idx) != 0) {
    u6_map_close(&ctx);
    return fail("chunk index read x0y0");
  }
  if (chunk_idx != 5) {
    u6_map_close(&ctx);
    return fail("expected chunk index 5");
  }

  if (u6_map_get_chunk_index_at(&ctx, 8, 0, 0, &chunk_idx) != 0) {
    u6_map_close(&ctx);
    return fail("chunk index read x8y0");
  }
  if (chunk_idx != 7) {
    u6_map_close(&ctx);
    return fail("expected chunk index 7");
  }

  if (u6_chunk_read(&ctx, 5, chunk) != 0) {
    u6_map_close(&ctx);
    return fail("u6_chunk_read");
  }
  if (chunk[0] != 0x50 || chunk[63] != (uint8_t)(0x50 + 63)) {
    u6_map_close(&ctx);
    return fail("chunk contents mismatch");
  }

  if (u6_map_get_tile_at(&ctx, 0, 0, 0, &tile) != 0) {
    u6_map_close(&ctx);
    return fail("tile read x0y0");
  }
  if (tile != 0x50) {
    u6_map_close(&ctx);
    return fail("tile mismatch x0y0");
  }

  if (u6_map_get_tile_at(&ctx, 8, 0, 0, &tile) != 0) {
    u6_map_close(&ctx);
    return fail("tile read x8y0");
  }
  if (tile != 0x70) {
    u6_map_close(&ctx);
    return fail("tile mismatch x8y0");
  }

  if (u6_map_get_chunk_index_at(&ctx, 0, 0, 0, NULL) != -1) {
    u6_map_close(&ctx);
    return fail("expected arg validation failure");
  }

  if (u6_chunk_read(&ctx, -1, chunk) != -2) {
    u6_map_close(&ctx);
    return fail("expected negative chunk index rejection");
  }

  u6_map_close(&ctx);
  puts("PASS: u6_map compatibility");
  return 0;
}
