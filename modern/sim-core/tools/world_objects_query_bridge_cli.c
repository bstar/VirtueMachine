#include "u6_objstatus.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct QueryObject {
  char key[40];
  int x;
  int y;
  int z;
  int status;
  int tile_flag;
  int source_area;
  int source_index;
} QueryObject;

typedef struct QuerySpec {
  int has_x;
  int x;
  int has_y;
  int y;
  int has_z;
  int z;
  int radius;
  int projection_footprint;
  int limit;
} QuerySpec;

static int parse_int(const char *s) {
  if (s == NULL) return 0;
  return (int)strtol(s, NULL, 10);
}

static int parse_obj_arg(const char *arg, QueryObject *out) {
  char buf[256];
  char *parts[9];
  size_t n = 0;
  char *tok;
  if (arg == NULL || out == NULL) return 0;
  memset(buf, 0, sizeof(buf));
  strncpy(buf, arg, sizeof(buf) - 1);
  tok = strtok(buf, ":");
  while (tok != NULL && n < 9) {
    parts[n++] = tok;
    tok = strtok(NULL, ":");
  }
  if (n != 9) return 0;
  memset(out, 0, sizeof(*out));
  strncpy(out->key, parts[0], sizeof(out->key) - 1);
  out->x = parse_int(parts[1]);
  out->y = parse_int(parts[2]);
  out->z = parse_int(parts[3]);
  out->status = parse_int(parts[4]) & 0xff;
  out->tile_flag = parse_int(parts[8]) & 0xff;
  out->source_area = parse_int(parts[6]);
  out->source_index = parse_int(parts[7]);
  return out->key[0] != '\0';
}

static int is_status_0010(int status) {
  return (status & 0x10) != 0;
}

static int cmp_objects(const void *va, const void *vb) {
  const QueryObject *a = (const QueryObject *)va;
  const QueryObject *b = (const QueryObject *)vb;
  const int a_use = u6_obj_status_coord_use((unsigned char)(a->status & 0xff));
  const int b_use = u6_obj_status_coord_use((unsigned char)(b->status & 0xff));
  if (a_use != 0 && b_use == 0) return -1;
  if (b_use != 0 && a_use == 0) return 1;
  if (a->y != b->y) return a->y - b->y;
  if (a->x != b->x) return a->x - b->x;
  if (a->z != b->z) return b->z - a->z;
  if (is_status_0010(a->status) != is_status_0010(b->status)) {
    return is_status_0010(a->status) ? -1 : 1;
  }
  if (a->source_area != b->source_area) return a->source_area - b->source_area;
  if (a->source_index != b->source_index) return a->source_index - b->source_index;
  return strcmp(a->key, b->key);
}

static int footprint_hits(const QueryObject *o, const QuerySpec *q) {
  const int x = o->x;
  const int y = o->y;
  const int dx = abs(x - q->x);
  const int dy = abs(y - q->y);
  if (dx <= q->radius && dy <= q->radius) {
    return 1;
  }
  if (o->tile_flag & 0x80) {
    const int ldx = abs((x - 1) - q->x);
    const int ldy = abs(y - q->y);
    if (ldx <= q->radius && ldy <= q->radius) return 1;
  }
  if (o->tile_flag & 0x40) {
    const int udx = abs(x - q->x);
    const int udy = abs((y - 1) - q->y);
    if (udx <= q->radius && udy <= q->radius) return 1;
  }
  if ((o->tile_flag & 0xc0) == 0xc0) {
    const int cdx = abs((x - 1) - q->x);
    const int cdy = abs((y - 1) - q->y);
    if (cdx <= q->radius && cdy <= q->radius) return 1;
  }
  return 0;
}

static int object_matches(const QueryObject *o, const QuerySpec *q) {
  if (q->has_z && o->z != q->z) return 0;
  if (q->has_x && q->has_y) {
    if (q->projection_footprint) {
      return footprint_hits(o, q);
    }
    if (abs(o->x - q->x) > q->radius) return 0;
    if (abs(o->y - q->y) > q->radius) return 0;
  }
  return 1;
}

int main(int argc, char **argv) {
  QuerySpec q;
  QueryObject *objects;
  size_t count;
  size_t i;
  int emitted = 0;

  if (argc < 11) {
    fprintf(stderr, "usage: %s <has_x> <x> <has_y> <y> <has_z> <z> <radius> <projection:anchor|footprint> <limit> <obj...>\n", argv[0]);
    return 2;
  }

  memset(&q, 0, sizeof(q));
  q.has_x = parse_int(argv[1]) != 0;
  q.x = parse_int(argv[2]);
  q.has_y = parse_int(argv[3]) != 0;
  q.y = parse_int(argv[4]);
  q.has_z = parse_int(argv[5]) != 0;
  q.z = parse_int(argv[6]);
  q.radius = parse_int(argv[7]);
  q.projection_footprint = strcmp(argv[8], "footprint") == 0;
  q.limit = parse_int(argv[9]);
  if (q.limit <= 0) q.limit = 1;

  count = (size_t)(argc - 10);
  objects = (QueryObject *)calloc(count, sizeof(QueryObject));
  if (objects == NULL) {
    fprintf(stderr, "allocation failure\n");
    return 2;
  }
  for (i = 0; i < count; i++) {
    if (!parse_obj_arg(argv[i + 10], &objects[i])) {
      free(objects);
      fprintf(stderr, "invalid obj format: %s\n", argv[i + 10]);
      return 2;
    }
  }

  qsort(objects, count, sizeof(QueryObject), cmp_objects);

  printf("keys=");
  for (i = 0; i < count; i++) {
    if (!object_matches(&objects[i], &q)) continue;
    if (emitted > 0) putchar(',');
    fputs(objects[i].key, stdout);
    emitted += 1;
    if (emitted >= q.limit) break;
  }
  putchar('\n');

  free(objects);
  return 0;
}
