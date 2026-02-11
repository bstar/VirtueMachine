#include "u6_map.h"

#include <stdio.h>
#include <string.h>

#define MK_MAP_ID(x, y) (((x) >> 7) + (((y) >> 4) & 0x38))

static uint16_t read_u16_le(const uint8_t *p) {
  return (uint16_t)p[0] | ((uint16_t)p[1] << 8);
}

static int read_exact(FILE *fp, long offset, void *buf, size_t len) {
  if (fseek(fp, offset, SEEK_SET) != 0) {
    return -1;
  }
  if (fread(buf, 1, len, fp) != len) {
    return -2;
  }
  return 0;
}

int u6_map_open(U6MapContext *ctx, const char *map_path, const char *chunks_path) {
  FILE *map_fp;
  FILE *chunks_fp;

  if (ctx == NULL || map_path == NULL || chunks_path == NULL) {
    return -1;
  }

  map_fp = fopen(map_path, "rb");
  if (map_fp == NULL) {
    return -2;
  }
  chunks_fp = fopen(chunks_path, "rb");
  if (chunks_fp == NULL) {
    fclose(map_fp);
    return -3;
  }

  memset(ctx, 0, sizeof(*ctx));
  ctx->map_file = map_fp;
  ctx->chunks_file = chunks_fp;
  ctx->loaded_z = -1;
  ctx->loaded_map_id0 = -1;
  for (int i = 0; i < 4; i++) {
    ctx->loaded_map_ids[i] = -1;
  }
  return 0;
}

void u6_map_close(U6MapContext *ctx) {
  if (ctx == NULL) {
    return;
  }
  if (ctx->map_file != NULL) {
    fclose((FILE *)ctx->map_file);
    ctx->map_file = NULL;
  }
  if (ctx->chunks_file != NULL) {
    fclose((FILE *)ctx->chunks_file);
    ctx->chunks_file = NULL;
  }
}

int u6_map_load_window(U6MapContext *ctx, int x, int y, int z) {
  FILE *map_fp;
  int map_id;

  if (ctx == NULL || ctx->map_file == NULL) {
    return -1;
  }

  map_fp = (FILE *)ctx->map_file;

  if (z != 0) {
    long off = (long)((z + z + z) << 9) + 0x5a00L;
    if (read_exact(map_fp, off, ctx->map_window, sizeof(ctx->map_window)) != 0) {
      return -2;
    }
    ctx->loaded_z = z;
    ctx->loaded_map_id0 = -1;
    for (int i = 0; i < 4; i++) {
      ctx->loaded_map_ids[i] = -1;
    }
    return 0;
  }

  map_id = MK_MAP_ID(x & 0x3ff, y & 0x3ff);
  ctx->loaded_map_ids[0] = map_id;
  ctx->loaded_map_ids[1] = (map_id + 1) & 0x3f;
  ctx->loaded_map_ids[2] = (map_id + 8) & 0x3f;
  ctx->loaded_map_ids[3] = (map_id + 9) & 0x3f;

  for (int i = 0; i < 4; i++) {
    long map_off = (long)ctx->loaded_map_ids[i] * 0x180L;
    if (read_exact(map_fp, map_off, ctx->map_window + (i * 0x180), 0x180) != 0) {
      return -3;
    }
  }

  ctx->loaded_z = 0;
  ctx->loaded_map_id0 = map_id;
  return 0;
}

int u6_map_get_chunk_index_at(U6MapContext *ctx, int x, int y, int z, int *out_chunk_index) {
  int si;
  int entry_word;

  if (ctx == NULL || out_chunk_index == NULL) {
    return -1;
  }
  if (u6_map_load_window(ctx, x, y, z) != 0) {
    return -2;
  }

  x &= 0x3ff;
  y &= 0x3ff;

  if (z != 0) {
    si = (x >> 3) & 0x1f;
    si += (y << 2) & 0x3e0;
    si += si >> 1;
  } else {
    int bp02 = 0;
    int map_id = MK_MAP_ID(x, y);
    if ((map_id - ctx->loaded_map_id0) & 1) {
      bp02 = 0x100;
    }
    if ((map_id - ctx->loaded_map_id0) & 8) {
      bp02 += 0x200;
    }
    si = ((x >> 3) & 0xf) + bp02;
    si += (y << 1) & 0xf0;
    si += si >> 1;
  }

  if (si < 0 || si + 1 >= (int)sizeof(ctx->map_window)) {
    return -3;
  }

  entry_word = (int)read_u16_le(ctx->map_window + si);
  if (x & 8) {
    *out_chunk_index = entry_word >> 4;
  } else {
    *out_chunk_index = entry_word & 0x0fff;
  }
  return 0;
}

int u6_chunk_read(U6MapContext *ctx, int chunk_index, uint8_t out_chunk[0x40]) {
  FILE *chunks_fp;

  if (ctx == NULL || out_chunk == NULL || ctx->chunks_file == NULL) {
    return -1;
  }
  if (chunk_index < 0) {
    return -2;
  }

  chunks_fp = (FILE *)ctx->chunks_file;
  if (read_exact(chunks_fp, ((long)chunk_index) << 6, out_chunk, 0x40) != 0) {
    return -3;
  }
  return 0;
}

int u6_map_get_tile_at(U6MapContext *ctx, int x, int y, int z, uint8_t *out_tile) {
  int chunk_index;
  uint8_t chunk[0x40];
  int rc;

  if (ctx == NULL || out_tile == NULL) {
    return -1;
  }

  rc = u6_map_get_chunk_index_at(ctx, x, y, z, &chunk_index);
  if (rc != 0) {
    return rc;
  }
  rc = u6_chunk_read(ctx, chunk_index, chunk);
  if (rc != 0) {
    return rc;
  }

  *out_tile = chunk[((y & 7) * 8) + (x & 7)];
  return 0;
}
