#include "u6_entities.h"
#include "u6_objstatus.h"

#include <string.h>

static int16_t clamp_map_xy(int32_t v) {
  if (v < 0) {
    return 0;
  }
  if (v > 1023) {
    return 1023;
  }
  return (int16_t)v;
}

static int16_t clamp_map_z(int32_t v) {
  if (v < -8) {
    return -8;
  }
  if (v > 8) {
    return 8;
  }
  return (int16_t)v;
}

static uint16_t read_u16_le(const uint8_t *p) {
  return (uint16_t)((uint16_t)p[0] | ((uint16_t)p[1] << 8));
}

static int16_t read_i16_le(const uint8_t *p) {
  return (int16_t)read_u16_le(p);
}

static uint32_t read_u32_le(const uint8_t *p) {
  return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static void write_u16_le(uint8_t *p, uint16_t v) {
  p[0] = (uint8_t)(v & 0xffu);
  p[1] = (uint8_t)((v >> 8) & 0xffu);
}

static void write_i16_le(uint8_t *p, int16_t v) {
  write_u16_le(p, (uint16_t)v);
}

static void write_u32_le(uint8_t *p, uint32_t v) {
  p[0] = (uint8_t)(v & 0xffu);
  p[1] = (uint8_t)((v >> 8) & 0xffu);
  p[2] = (uint8_t)((v >> 16) & 0xffu);
  p[3] = (uint8_t)((v >> 24) & 0xffu);
}

int u6_entities_init(U6EntityState *state) {
  if (state == NULL) {
    return -1;
  }
  memset(state, 0, sizeof(*state));
  return 0;
}

int u6_entities_add_object(U6EntityState *state, const U6ObjectState *object_state) {
  if (state == NULL || object_state == NULL) {
    return -1;
  }
  if (state->object_count >= U6M_MAX_OBJECTS) {
    return -2;
  }
  state->objects[state->object_count] = *object_state;
  if (state->objects[state->object_count].status == 0u
      && state->objects[state->object_count].holder_kind == U6_OBJECT_HOLDER_NONE
      && state->objects[state->object_count].holder_id == 0u) {
    state->objects[state->object_count].status = u6_obj_status_to_locxyz(0u);
  }
  state->object_count++;
  return 0;
}

int u6_entities_add_npc(U6EntityState *state, const U6NpcState *npc_state) {
  if (state == NULL || npc_state == NULL) {
    return -1;
  }
  if (state->npc_count >= U6M_MAX_NPCS) {
    return -2;
  }
  state->npcs[state->npc_count] = *npc_state;
  state->npc_count++;
  return 0;
}

U6ObjectState *u6_entities_find_object(U6EntityState *state, uint16_t object_id) {
  if (state == NULL) {
    return NULL;
  }
  for (size_t i = 0; i < state->object_count; i++) {
    if (state->objects[i].object_id == object_id) {
      return &state->objects[i];
    }
  }
  return NULL;
}

U6NpcState *u6_entities_find_npc(U6EntityState *state, uint16_t npc_id) {
  if (state == NULL) {
    return NULL;
  }
  for (size_t i = 0; i < state->npc_count; i++) {
    if (state->npcs[i].npc_id == npc_id) {
      return &state->npcs[i];
    }
  }
  return NULL;
}

int u6_entities_move_npc(U6EntityState *state, uint16_t npc_id, int16_t x, int16_t y, int16_t z) {
  U6NpcState *npc;

  if (state == NULL) {
    return -1;
  }
  npc = u6_entities_find_npc(state, npc_id);
  if (npc == NULL) {
    return -2;
  }
  npc->map_x = clamp_map_xy(x);
  npc->map_y = clamp_map_xy(y);
  npc->map_z = clamp_map_z(z);
  return 0;
}

int u6_entities_step(U6EntityState *state, uint32_t tick) {
  if (state == NULL) {
    return -1;
  }

  if ((tick % 4u) != 0u) {
    return 0;
  }

  for (size_t i = 0; i < state->npc_count; i++) {
    U6NpcState *npc = &state->npcs[i];
    int32_t next_x;
    int32_t next_y;

    if ((npc->flags & U6_NPC_FLAG_ACTIVE) == 0u || (npc->flags & U6_NPC_FLAG_PATROL) == 0u) {
      continue;
    }

    next_x = (int32_t)npc->map_x + npc->patrol_dx;
    next_y = (int32_t)npc->map_y + npc->patrol_dy;

    if (next_x < 0 || next_x > 1023) {
      npc->patrol_dx = (int8_t)(-npc->patrol_dx);
      next_x = (int32_t)npc->map_x + npc->patrol_dx;
    }
    if (next_y < 0 || next_y > 1023) {
      npc->patrol_dy = (int8_t)(-npc->patrol_dy);
      next_y = (int32_t)npc->map_y + npc->patrol_dy;
    }

    npc->map_x = clamp_map_xy(next_x);
    npc->map_y = clamp_map_xy(next_y);
  }

  return 0;
}

size_t u6_entities_serialized_size(const U6EntityState *state) {
  if (state == NULL) {
    return 0;
  }
  return U6M_ENTITY_HEADER_SIZE + (state->object_count * U6M_ENTITY_OBJECT_SIZE)
         + (state->npc_count * U6M_ENTITY_NPC_SIZE);
}

int u6_entities_serialize(const U6EntityState *state,
                          uint8_t *out,
                          size_t out_size,
                          size_t *out_written) {
  size_t need;
  size_t off;

  if (state == NULL || out == NULL || out_written == NULL) {
    return -1;
  }
  if (state->object_count > U6M_MAX_OBJECTS || state->npc_count > U6M_MAX_NPCS) {
    return -2;
  }

  need = u6_entities_serialized_size(state);
  if (out_size < need) {
    return -3;
  }

  write_u32_le(out + 0, U6M_ENTITY_MAGIC);
  write_u16_le(out + 4, U6M_ENTITY_VERSION);
  write_u16_le(out + 6, (uint16_t)state->object_count);
  write_u16_le(out + 8, (uint16_t)state->npc_count);
  write_u16_le(out + 10, 0u);

  off = U6M_ENTITY_HEADER_SIZE;
  for (size_t i = 0; i < state->object_count; i++) {
    const U6ObjectState *obj = &state->objects[i];
    write_u16_le(out + off + 0, obj->object_id);
    write_u16_le(out + off + 2, obj->tile_id);
    write_i16_le(out + off + 4, obj->map_x);
    write_i16_le(out + off + 6, obj->map_y);
    write_i16_le(out + off + 8, obj->map_z);
    out[off + 10] = obj->quantity;
    out[off + 11] = obj->flags;
    out[off + 12] = obj->status;
    out[off + 13] = obj->holder_kind;
    write_u16_le(out + off + 14, obj->holder_id);
    off += U6M_ENTITY_OBJECT_SIZE;
  }

  for (size_t i = 0; i < state->npc_count; i++) {
    const U6NpcState *npc = &state->npcs[i];
    write_u16_le(out + off + 0, npc->npc_id);
    write_u16_le(out + off + 2, npc->body_tile);
    write_i16_le(out + off + 4, npc->map_x);
    write_i16_le(out + off + 6, npc->map_y);
    write_i16_le(out + off + 8, npc->map_z);
    out[off + 10] = npc->flags;
    out[off + 11] = (uint8_t)npc->patrol_dx;
    out[off + 12] = (uint8_t)npc->patrol_dy;
    off += U6M_ENTITY_NPC_SIZE;
  }

  *out_written = need;
  return 0;
}

int u6_entities_deserialize(U6EntityState *state, const uint8_t *in, size_t in_size) {
  uint16_t version;
  uint16_t object_count;
  uint16_t npc_count;
  size_t off;
  size_t need;

  if (state == NULL || in == NULL) {
    return -1;
  }
  if (in_size < U6M_ENTITY_HEADER_SIZE) {
    return -2;
  }
  if (read_u32_le(in + 0) != U6M_ENTITY_MAGIC) {
    return -3;
  }
  version = read_u16_le(in + 4);
  if (version != U6M_ENTITY_VERSION) {
    return -4;
  }

  object_count = read_u16_le(in + 6);
  npc_count = read_u16_le(in + 8);
  if (object_count > U6M_MAX_OBJECTS || npc_count > U6M_MAX_NPCS) {
    return -5;
  }

  need = U6M_ENTITY_HEADER_SIZE + ((size_t)object_count * U6M_ENTITY_OBJECT_SIZE)
         + ((size_t)npc_count * U6M_ENTITY_NPC_SIZE);
  if (in_size < need) {
    return -6;
  }

  memset(state, 0, sizeof(*state));
  state->object_count = object_count;
  state->npc_count = npc_count;

  off = U6M_ENTITY_HEADER_SIZE;
  for (size_t i = 0; i < state->object_count; i++) {
    U6ObjectState *obj = &state->objects[i];
    obj->object_id = read_u16_le(in + off + 0);
    obj->tile_id = read_u16_le(in + off + 2);
    obj->map_x = read_i16_le(in + off + 4);
    obj->map_y = read_i16_le(in + off + 6);
    obj->map_z = read_i16_le(in + off + 8);
    obj->quantity = in[off + 10];
    obj->flags = in[off + 11];
    obj->status = in[off + 12];
    obj->holder_kind = in[off + 13];
    obj->holder_id = read_u16_le(in + off + 14);
    off += U6M_ENTITY_OBJECT_SIZE;
  }

  for (size_t i = 0; i < state->npc_count; i++) {
    U6NpcState *npc = &state->npcs[i];
    npc->npc_id = read_u16_le(in + off + 0);
    npc->body_tile = read_u16_le(in + off + 2);
    npc->map_x = read_i16_le(in + off + 4);
    npc->map_y = read_i16_le(in + off + 6);
    npc->map_z = read_i16_le(in + off + 8);
    npc->flags = in[off + 10];
    npc->patrol_dx = (int8_t)in[off + 11];
    npc->patrol_dy = (int8_t)in[off + 12];
    off += U6M_ENTITY_NPC_SIZE;
  }

  return 0;
}
