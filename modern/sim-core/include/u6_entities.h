#ifndef U6M_U6_ENTITIES_H
#define U6M_U6_ENTITIES_H

#include <stddef.h>
#include <stdint.h>

enum {
  U6M_MAX_OBJECTS = 256,
  U6M_MAX_NPCS = 64,
  U6M_ENTITY_MAGIC = 0x4e453655u, /* U6EN */
  U6M_ENTITY_VERSION = 1,
  U6M_ENTITY_HEADER_SIZE = 12,
  U6M_ENTITY_OBJECT_SIZE = 12,
  U6M_ENTITY_NPC_SIZE = 13
};

typedef enum U6ObjectType {
  U6_OBJECT_ITEM = 1,
  U6_OBJECT_ACTOR = 2,
  U6_OBJECT_CONTAINER = 3
} U6ObjectType;

enum {
  U6_OBJECT_FLAG_USABLE = 1u << 0,
  U6_OBJECT_FLAG_OPENABLE = 1u << 1,
  U6_OBJECT_FLAG_OPEN = 1u << 2,
  U6_OBJECT_FLAG_LOCKED = 1u << 3
};

typedef struct U6ObjectState {
  uint16_t object_id;
  uint16_t tile_id;
  int16_t map_x;
  int16_t map_y;
  int16_t map_z;
  uint8_t quantity;
  uint8_t flags;
} U6ObjectState;

enum {
  U6_NPC_FLAG_ACTIVE = 1u << 0,
  U6_NPC_FLAG_PATROL = 1u << 1
};

typedef struct U6NpcState {
  uint16_t npc_id;
  uint16_t body_tile;
  int16_t map_x;
  int16_t map_y;
  int16_t map_z;
  int8_t patrol_dx;
  int8_t patrol_dy;
  uint8_t flags;
} U6NpcState;

typedef struct U6EntityState {
  size_t object_count;
  size_t npc_count;
  U6ObjectState objects[U6M_MAX_OBJECTS];
  U6NpcState npcs[U6M_MAX_NPCS];
} U6EntityState;

int u6_entities_init(U6EntityState *state);
int u6_entities_add_object(U6EntityState *state, const U6ObjectState *object_state);
int u6_entities_add_npc(U6EntityState *state, const U6NpcState *npc_state);
U6ObjectState *u6_entities_find_object(U6EntityState *state, uint16_t object_id);
U6NpcState *u6_entities_find_npc(U6EntityState *state, uint16_t npc_id);
int u6_entities_move_npc(U6EntityState *state, uint16_t npc_id, int16_t x, int16_t y, int16_t z);
int u6_entities_step(U6EntityState *state, uint32_t tick);

size_t u6_entities_serialized_size(const U6EntityState *state);
int u6_entities_serialize(const U6EntityState *state,
                          uint8_t *out,
                          size_t out_size,
                          size_t *out_written);
int u6_entities_deserialize(U6EntityState *state, const uint8_t *in, size_t in_size);

#endif
