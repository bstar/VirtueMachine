#ifndef U6M_U6_MAP_H
#define U6M_U6_MAP_H

#include <stdint.h>

typedef struct U6MapContext {
  void *map_file;
  void *chunks_file;
  int loaded_z;
  int loaded_map_id0;
  int loaded_map_ids[4];
  uint8_t map_window[0x600];
} U6MapContext;

int u6_map_open(U6MapContext *ctx, const char *map_path, const char *chunks_path);
void u6_map_close(U6MapContext *ctx);

int u6_map_load_window(U6MapContext *ctx, int x, int y, int z);
int u6_map_get_chunk_index_at(U6MapContext *ctx, int x, int y, int z, int *out_chunk_index);
int u6_chunk_read(U6MapContext *ctx, int chunk_index, uint8_t out_chunk[0x40]);
int u6_map_get_tile_at(U6MapContext *ctx, int x, int y, int z, uint8_t *out_tile);

#endif
