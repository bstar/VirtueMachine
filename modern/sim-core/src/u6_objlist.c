#include "u6_objlist.h"

#include <limits.h>

static uint16_t read_u16_le(const uint8_t *p) {
  return (uint16_t)((uint16_t)p[0] | ((uint16_t)p[1] << 8));
}

static int16_t read_i16_le(const uint8_t *p) {
  return (int16_t)read_u16_le(p);
}

static void write_u16_le(uint8_t *p, uint16_t v) {
  p[0] = (uint8_t)(v & 0xffu);
  p[1] = (uint8_t)((v >> 8) & 0xffu);
}

static void write_i16_le(uint8_t *p, int16_t v) {
  write_u16_le(p, (uint16_t)v);
}

static int16_t clamp_i16(int32_t v) {
  if (v < INT16_MIN) {
    return INT16_MIN;
  }
  if (v > INT16_MAX) {
    return INT16_MAX;
  }
  return (int16_t)v;
}

int u6_objlist_extract_world(const uint8_t *objlist, size_t objlist_size, SimWorldState *out_world) {
  const uint8_t *tail;

  if (objlist == 0 || out_world == 0) {
    return -1;
  }
  if (objlist_size < U6_OBJLIST_MIN_SIZE) {
    return -2;
  }

  tail = objlist + U6_OBJLIST_TAIL_OFFSET;

  /* Map a vetted subset from D_2C4A serialized tail. */
  out_world->is_on_quest = tail[0x00];
  out_world->next_sleep = tail[0x01];
  out_world->time_m = tail[0x02];
  out_world->time_h = tail[0x03];
  out_world->date_d = tail[0x04];
  out_world->date_m = tail[0x05];
  out_world->date_y = read_u16_le(tail + 0x06);
  out_world->wind_dir = read_i16_le(tail + 0x09);
  out_world->active = tail[0x0B];
  out_world->map_x = read_i16_le(tail + 0x0D);
  out_world->map_y = read_i16_le(tail + 0x0F);
  out_world->map_z = read_i16_le(tail + 0x11);
  out_world->sound_enabled = (read_i16_le(tail + 0x29) != 0) ? 1u : 0u;
  out_world->in_combat = tail[0x78];
  return 0;
}

int u6_objlist_patch_world(uint8_t *objlist, size_t objlist_size, const SimWorldState *world) {
  uint8_t *tail;

  if (objlist == 0 || world == 0) {
    return -1;
  }
  if (objlist_size < U6_OBJLIST_MIN_SIZE) {
    return -2;
  }

  tail = objlist + U6_OBJLIST_TAIL_OFFSET;

  /* Patch only mapped fields; keep unknown bytes untouched. */
  tail[0x00] = world->is_on_quest;
  tail[0x01] = world->next_sleep;
  tail[0x02] = world->time_m;
  tail[0x03] = world->time_h;
  tail[0x04] = world->date_d;
  tail[0x05] = world->date_m;
  write_u16_le(tail + 0x06, world->date_y);
  write_i16_le(tail + 0x09, world->wind_dir);
  tail[0x0B] = world->active;
  write_i16_le(tail + 0x0D, clamp_i16(world->map_x));
  write_i16_le(tail + 0x0F, clamp_i16(world->map_y));
  write_i16_le(tail + 0x11, world->map_z);
  write_i16_le(tail + 0x29, world->sound_enabled ? 1 : 0);
  tail[0x78] = world->in_combat;
  return 0;
}
