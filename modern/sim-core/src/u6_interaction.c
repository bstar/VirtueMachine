#include "u6_interaction.h"

#include <stdlib.h>

static int in_talk_range(const U6NpcState *a, const U6NpcState *b) {
  int dx;
  int dy;

  if (a == NULL || b == NULL) {
    return 0;
  }

  dx = abs((int)a->map_x - (int)b->map_x);
  dy = abs((int)a->map_y - (int)b->map_y);
  return (dx + dy) <= 2;
}

int u6_interaction_apply(U6EntityState *state,
                         const U6InteractionRequest *request,
                         U6InteractionResult *out_result) {
  U6NpcState *actor;

  if (state == NULL || request == NULL || out_result == NULL) {
    return U6_INTERACT_ERR_NULL;
  }

  out_result->code = U6_INTERACT_ERR_INVALID;
  out_result->event = U6_EVENT_NONE;
  out_result->affected_id = 0;

  actor = u6_entities_find_npc(state, request->actor_npc_id);
  if (actor == NULL || (actor->flags & U6_NPC_FLAG_ACTIVE) == 0u) {
    out_result->code = U6_INTERACT_ERR_NOT_FOUND;
    return out_result->code;
  }

  if (request->verb == U6_INTERACT_TALK) {
    U6NpcState *target = u6_entities_find_npc(state, request->target_id);
    if (target == NULL || (target->flags & U6_NPC_FLAG_ACTIVE) == 0u) {
      out_result->code = U6_INTERACT_ERR_NOT_FOUND;
      return out_result->code;
    }
    if (!in_talk_range(actor, target)) {
      out_result->code = U6_INTERACT_ERR_RANGE;
      return out_result->code;
    }
    out_result->code = U6_INTERACT_OK;
    out_result->event = U6_EVENT_TALKED;
    out_result->affected_id = target->npc_id;
    return out_result->code;
  }

  if (request->verb == U6_INTERACT_USE) {
    U6ObjectState *target_obj = u6_entities_find_object(state, request->target_id);
    if (target_obj == NULL) {
      out_result->code = U6_INTERACT_ERR_NOT_FOUND;
      return out_result->code;
    }
    if ((target_obj->flags & U6_OBJECT_FLAG_USABLE) == 0u) {
      out_result->code = U6_INTERACT_ERR_BLOCKED;
      return out_result->code;
    }
    out_result->code = U6_INTERACT_OK;
    out_result->event = U6_EVENT_USED;
    out_result->affected_id = target_obj->object_id;
    return out_result->code;
  }

  if (request->verb == U6_INTERACT_OPEN) {
    U6ObjectState *target_obj = u6_entities_find_object(state, request->target_id);
    if (target_obj == NULL) {
      out_result->code = U6_INTERACT_ERR_NOT_FOUND;
      return out_result->code;
    }
    if ((target_obj->flags & U6_OBJECT_FLAG_OPENABLE) == 0u) {
      out_result->code = U6_INTERACT_ERR_BLOCKED;
      return out_result->code;
    }
    if ((target_obj->flags & U6_OBJECT_FLAG_LOCKED) != 0u) {
      out_result->code = U6_INTERACT_ERR_BLOCKED;
      return out_result->code;
    }
    if ((target_obj->flags & U6_OBJECT_FLAG_OPEN) != 0u) {
      out_result->code = U6_INTERACT_OK;
      out_result->event = U6_EVENT_ALREADY_OPEN;
      out_result->affected_id = target_obj->object_id;
      return out_result->code;
    }

    target_obj->flags |= U6_OBJECT_FLAG_OPEN;
    out_result->code = U6_INTERACT_OK;
    out_result->event = U6_EVENT_OPENED;
    out_result->affected_id = target_obj->object_id;
    return out_result->code;
  }

  out_result->code = U6_INTERACT_ERR_INVALID;
  return out_result->code;
}
