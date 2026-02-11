#include "u6_entities.h"

#include <stdio.h>
#include <string.h>

static int test_npc_patrol_step(void) {
  U6EntityState state;
  U6NpcState npc;
  int rc;

  rc = u6_entities_init(&state);
  if (rc != 0) {
    return 1;
  }

  memset(&npc, 0, sizeof(npc));
  npc.npc_id = 7;
  npc.body_tile = 0x123;
  npc.map_x = 10;
  npc.map_y = 20;
  npc.map_z = 0;
  npc.patrol_dx = 1;
  npc.patrol_dy = 0;
  npc.flags = U6_NPC_FLAG_ACTIVE | U6_NPC_FLAG_PATROL;

  rc = u6_entities_add_npc(&state, &npc);
  if (rc != 0) {
    return 2;
  }

  rc = u6_entities_step(&state, 1);
  if (rc != 0 || state.npcs[0].map_x != 10) {
    return 3;
  }

  rc = u6_entities_step(&state, 4);
  if (rc != 0 || state.npcs[0].map_x != 11) {
    return 4;
  }

  state.npcs[0].map_x = 1023;
  state.npcs[0].patrol_dx = 1;
  rc = u6_entities_step(&state, 8);
  if (rc != 0) {
    return 5;
  }
  if (state.npcs[0].map_x != 1022 || state.npcs[0].patrol_dx != -1) {
    return 6;
  }

  return 0;
}

static int test_entities_roundtrip(void) {
  U6EntityState in_state;
  U6EntityState out_state;
  uint8_t blob[512];
  size_t written = 0;
  U6ObjectState obj;
  U6NpcState npc;
  int rc;

  rc = u6_entities_init(&in_state);
  if (rc != 0) {
    return 10;
  }

  memset(&obj, 0, sizeof(obj));
  obj.object_id = 42;
  obj.tile_id = 0x88;
  obj.map_x = 100;
  obj.map_y = 200;
  obj.map_z = 0;
  obj.quantity = 3;
  obj.flags = (uint8_t)U6_OBJECT_ITEM;
  rc = u6_entities_add_object(&in_state, &obj);
  if (rc != 0) {
    return 11;
  }

  memset(&npc, 0, sizeof(npc));
  npc.npc_id = 9;
  npc.body_tile = 0x44;
  npc.map_x = 222;
  npc.map_y = 333;
  npc.map_z = 1;
  npc.patrol_dx = -1;
  npc.patrol_dy = 1;
  npc.flags = U6_NPC_FLAG_ACTIVE | U6_NPC_FLAG_PATROL;
  rc = u6_entities_add_npc(&in_state, &npc);
  if (rc != 0) {
    return 12;
  }

  rc = u6_entities_serialize(&in_state, blob, sizeof(blob), &written);
  if (rc != 0 || written != u6_entities_serialized_size(&in_state)) {
    return 13;
  }

  rc = u6_entities_deserialize(&out_state, blob, written);
  if (rc != 0) {
    return 14;
  }

  if (out_state.object_count != 1 || out_state.npc_count != 1) {
    return 15;
  }

  if (memcmp(&in_state.objects[0], &out_state.objects[0], sizeof(U6ObjectState)) != 0) {
    return 16;
  }

  if (memcmp(&in_state.npcs[0], &out_state.npcs[0], sizeof(U6NpcState)) != 0) {
    return 17;
  }

  return 0;
}

int main(void) {
  int rc;

  rc = test_npc_patrol_step();
  if (rc != 0) {
    fprintf(stderr, "test_npc_patrol_step failed: %d\n", rc);
    return 1;
  }

  rc = test_entities_roundtrip();
  if (rc != 0) {
    fprintf(stderr, "test_entities_roundtrip failed: %d\n", rc);
    return 1;
  }

  printf("test_entities: ok\n");
  return 0;
}
