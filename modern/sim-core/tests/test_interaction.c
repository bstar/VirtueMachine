#include "u6_entities.h"
#include "u6_interaction.h"
#include "u6_objstatus.h"

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

static int test_take_equip_put_drop_sequence(void) {
  U6EntityState state;
  U6NpcState avatar;
  U6ObjectState sword;
  U6ObjectState chest;
  U6InteractionRequest req;
  U6InteractionResult res;
  U6ObjectState *obj;
  int rc;

  rc = u6_entities_init(&state);
  if (rc != 0) {
    return 20;
  }

  memset(&avatar, 0, sizeof(avatar));
  avatar.npc_id = 1;
  avatar.map_x = 200;
  avatar.map_y = 200;
  avatar.map_z = 0;
  avatar.flags = U6_NPC_FLAG_ACTIVE;
  if (u6_entities_add_npc(&state, &avatar) != 0) {
    return 21;
  }

  memset(&sword, 0, sizeof(sword));
  sword.object_id = 300;
  sword.map_x = 201;
  sword.map_y = 200;
  sword.map_z = 0;
  sword.status = u6_obj_status_to_locxyz(0);
  sword.flags = U6_OBJECT_FLAG_EQUIPPABLE;
  if (u6_entities_add_object(&state, &sword) != 0) {
    return 22;
  }

  memset(&chest, 0, sizeof(chest));
  chest.object_id = 301;
  chest.map_x = 200;
  chest.map_y = 201;
  chest.map_z = 0;
  chest.status = u6_obj_status_to_locxyz(0);
  chest.flags = U6_OBJECT_FLAG_OPENABLE | U6_OBJECT_FLAG_OPEN;
  if (u6_entities_add_object(&state, &chest) != 0) {
    return 23;
  }

  memset(&req, 0, sizeof(req));
  req.actor_npc_id = 1;
  req.target_id = 300;

  req.verb = U6_INTERACT_TAKE;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_TOOK) {
    return 24;
  }
  obj = u6_entities_find_object(&state, 300);
  if (!obj || !u6_obj_status_is_inventory(obj->status) || obj->holder_kind != U6_OBJECT_HOLDER_NPC
      || obj->holder_id != 1) {
    return 25;
  }

  req.verb = U6_INTERACT_EQUIP;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_EQUIPPED) {
    return 26;
  }
  if (!u6_obj_status_is_equip(obj->status) || obj->holder_kind != U6_OBJECT_HOLDER_NPC || obj->holder_id != 1) {
    return 27;
  }

  req.verb = U6_INTERACT_PUT;
  req.aux_target_id = 301;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_PUT) {
    return 28;
  }
  if (!u6_obj_status_is_contained(obj->status) || obj->holder_kind != U6_OBJECT_HOLDER_OBJECT
      || obj->holder_id != 301) {
    return 29;
  }

  req.verb = U6_INTERACT_TAKE;
  req.aux_target_id = 0;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_TOOK) {
    return 30;
  }
  if (!u6_obj_status_is_inventory(obj->status) || obj->holder_kind != U6_OBJECT_HOLDER_NPC || obj->holder_id != 1) {
    return 31;
  }

  req.verb = U6_INTERACT_DROP;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_OK || res.event != U6_EVENT_DROPPED) {
    return 32;
  }
  if (!u6_obj_status_is_locxyz(obj->status) || obj->holder_kind != U6_OBJECT_HOLDER_NONE || obj->holder_id != 0) {
    return 33;
  }
  if (obj->map_x != avatar.map_x || obj->map_y != avatar.map_y || obj->map_z != avatar.map_z) {
    return 34;
  }

  return 0;
}

static int test_invalid_transition_guards(void) {
  U6EntityState state;
  U6NpcState avatar;
  U6ObjectState cup;
  U6ObjectState chest;
  U6InteractionRequest req;
  U6InteractionResult res;
  int rc;

  rc = u6_entities_init(&state);
  if (rc != 0) {
    return 40;
  }

  memset(&avatar, 0, sizeof(avatar));
  avatar.npc_id = 1;
  avatar.map_x = 50;
  avatar.map_y = 50;
  avatar.map_z = 0;
  avatar.flags = U6_NPC_FLAG_ACTIVE;
  if (u6_entities_add_npc(&state, &avatar) != 0) {
    return 41;
  }

  memset(&cup, 0, sizeof(cup));
  cup.object_id = 401;
  cup.map_x = 50;
  cup.map_y = 50;
  cup.map_z = 0;
  cup.status = u6_obj_status_to_inventory(0);
  cup.holder_kind = U6_OBJECT_HOLDER_NPC;
  cup.holder_id = 99; /* not actor */
  if (u6_entities_add_object(&state, &cup) != 0) {
    return 42;
  }

  memset(&chest, 0, sizeof(chest));
  chest.object_id = 402;
  chest.map_x = 70;
  chest.map_y = 70;
  chest.map_z = 0;
  chest.status = u6_obj_status_to_locxyz(0);
  chest.flags = U6_OBJECT_FLAG_OPENABLE; /* closed */
  if (u6_entities_add_object(&state, &chest) != 0) {
    return 43;
  }

  memset(&req, 0, sizeof(req));
  req.actor_npc_id = 1;
  req.target_id = 401;

  req.verb = U6_INTERACT_DROP;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_ERR_BLOCKED) {
    return 44;
  }

  req.verb = U6_INTERACT_EQUIP;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_ERR_BLOCKED) {
    return 45;
  }

  /* make actor own item, then fail put due to distant/closed container */
  state.objects[0].holder_id = 1;
  req.verb = U6_INTERACT_PUT;
  req.aux_target_id = 402;
  rc = u6_interaction_apply(&state, &req, &res);
  if (rc != U6_INTERACT_ERR_RANGE) {
    return 46;
  }

  /* failed transition must preserve item inventory ownership */
  if (!u6_obj_status_is_inventory(state.objects[0].status) || state.objects[0].holder_kind != U6_OBJECT_HOLDER_NPC
      || state.objects[0].holder_id != 1) {
    return 47;
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

  rc = test_take_equip_put_drop_sequence();
  if (rc != 0) {
    fprintf(stderr, "test_take_equip_put_drop_sequence failed: %d\n", rc);
    return 1;
  }

  rc = test_invalid_transition_guards();
  if (rc != 0) {
    fprintf(stderr, "test_invalid_transition_guards failed: %d\n", rc);
    return 1;
  }

  printf("test_interaction: ok\n");
  return 0;
}
