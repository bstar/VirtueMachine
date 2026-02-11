#include "u6_entities.h"
#include "u6_interaction.h"

#include <stdio.h>
#include <string.h>

static int test_talk_success_and_range_fail(void) {
  U6EntityState state;
  U6NpcState avatar;
  U6NpcState guard;
  U6InteractionRequest req;
  U6InteractionResult res;
  int rc;

  rc = u6_entities_init(&state);
  if (rc != 0) {
    return 1;
  }

  memset(&avatar, 0, sizeof(avatar));
  avatar.npc_id = 1;
  avatar.map_x = 100;
  avatar.map_y = 100;
  avatar.flags = U6_NPC_FLAG_ACTIVE;

  memset(&guard, 0, sizeof(guard));
  guard.npc_id = 2;
  guard.map_x = 101;
  guard.map_y = 100;
  guard.flags = U6_NPC_FLAG_ACTIVE;

  if (u6_entities_add_npc(&state, &avatar) != 0 || u6_entities_add_npc(&state, &guard) != 0) {
    return 2;
  }

  req.verb = U6_INTERACT_TALK;
  req.actor_npc_id = 1;
  req.target_id = 2;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_TALKED || res.affected_id != 2) {
    return 3;
  }

  state.npcs[1].map_x = 120;
  state.npcs[1].map_y = 120;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_ERR_RANGE) {
    return 4;
  }

  return 0;
}

static int test_use_and_open_flow(void) {
  U6EntityState state;
  U6NpcState avatar;
  U6ObjectState lever;
  U6ObjectState chest;
  U6ObjectState locked_chest;
  U6InteractionRequest req;
  U6InteractionResult res;
  int rc;

  rc = u6_entities_init(&state);
  if (rc != 0) {
    return 10;
  }

  memset(&avatar, 0, sizeof(avatar));
  avatar.npc_id = 1;
  avatar.flags = U6_NPC_FLAG_ACTIVE;
  if (u6_entities_add_npc(&state, &avatar) != 0) {
    return 11;
  }

  memset(&lever, 0, sizeof(lever));
  lever.object_id = 100;
  lever.flags = U6_OBJECT_FLAG_USABLE;

  memset(&chest, 0, sizeof(chest));
  chest.object_id = 101;
  chest.flags = U6_OBJECT_FLAG_OPENABLE;

  memset(&locked_chest, 0, sizeof(locked_chest));
  locked_chest.object_id = 102;
  locked_chest.flags = U6_OBJECT_FLAG_OPENABLE | U6_OBJECT_FLAG_LOCKED;

  if (u6_entities_add_object(&state, &lever) != 0
      || u6_entities_add_object(&state, &chest) != 0
      || u6_entities_add_object(&state, &locked_chest) != 0) {
    return 12;
  }

  req.actor_npc_id = 1;

  req.verb = U6_INTERACT_USE;
  req.target_id = 100;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_USED || res.affected_id != 100) {
    return 13;
  }

  req.verb = U6_INTERACT_OPEN;
  req.target_id = 101;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_OPENED || (state.objects[1].flags & U6_OBJECT_FLAG_OPEN) == 0u) {
    return 14;
  }

  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_ALREADY_OPEN) {
    return 15;
  }

  req.target_id = 102;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_ERR_BLOCKED) {
    return 16;
  }

  req.target_id = 999;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_ERR_NOT_FOUND) {
    return 17;
  }

  return 0;
}

int main(void) {
  int rc;

  rc = test_talk_success_and_range_fail();
  if (rc != 0) {
    fprintf(stderr, "test_talk_success_and_range_fail failed: %d\n", rc);
    return 1;
  }

  rc = test_use_and_open_flow();
  if (rc != 0) {
    fprintf(stderr, "test_use_and_open_flow failed: %d\n", rc);
    return 1;
  }

  printf("test_interaction: ok\n");
  return 0;
}
