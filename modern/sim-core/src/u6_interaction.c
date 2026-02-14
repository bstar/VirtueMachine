#include "u6_interaction.h"
#include "u6_objstatus.h"

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

static int in_object_range(const U6NpcState *actor, const U6ObjectState *obj) {
  int dx;
  int dy;

  if (actor == NULL || obj == NULL) {
    return 0;
  }
  if (actor->map_z != obj->map_z) {
    return 0;
  }
  dx = abs((int)actor->map_x - (int)obj->map_x);
  dy = abs((int)actor->map_y - (int)obj->map_y);
  return (dx + dy) <= 2;
}

static int is_actor_owned_item(const U6ObjectState *obj, uint16_t actor_npc_id) {
  uint8_t coord_use;

  if (obj == NULL) {
    return 0;
  }
  coord_use = u6_obj_status_coord_use(obj->status);
  if (coord_use != U6_OBJ_COORD_USE_INVEN && coord_use != U6_OBJ_COORD_USE_EQUIP) {
    return 0;
  }
  return obj->holder_kind == U6_OBJECT_HOLDER_NPC && obj->holder_id == actor_npc_id;
}

static int container_allows_access(const U6ObjectState *container) {
  if (container == NULL) {
    return 0;
  }
  if ((container->flags & U6_OBJECT_FLAG_OPENABLE) == 0u) {
    return 1;
  }
  return (container->flags & U6_OBJECT_FLAG_OPEN) != 0u;
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

  if (request->verb == U6_INTERACT_TAKE) {
    U6ObjectState *target_obj = u6_entities_find_object(state, request->target_id);
    if (target_obj == NULL) {
      out_result->code = U6_INTERACT_ERR_NOT_FOUND;
      return out_result->code;
    }
    if (!u6_obj_status_is_locxyz(target_obj->status) && !u6_obj_status_is_contained(target_obj->status)) {
      out_result->code = U6_INTERACT_ERR_BLOCKED;
      return out_result->code;
    }
    if (u6_obj_status_is_locxyz(target_obj->status) && !in_object_range(actor, target_obj)) {
      out_result->code = U6_INTERACT_ERR_RANGE;
      return out_result->code;
    }
    if (u6_obj_status_is_contained(target_obj->status)) {
      U6ObjectState *container;
      if (target_obj->holder_kind != U6_OBJECT_HOLDER_OBJECT || target_obj->holder_id == 0u) {
        out_result->code = U6_INTERACT_ERR_BLOCKED;
        return out_result->code;
      }
      container = u6_entities_find_object(state, target_obj->holder_id);
      if (container == NULL || !container_allows_access(container)) {
        out_result->code = U6_INTERACT_ERR_BLOCKED;
        return out_result->code;
      }
      if (!in_object_range(actor, container)) {
        out_result->code = U6_INTERACT_ERR_RANGE;
        return out_result->code;
      }
    }
    target_obj->status = u6_obj_status_to_inventory(target_obj->status);
    target_obj->holder_kind = U6_OBJECT_HOLDER_NPC;
    target_obj->holder_id = actor->npc_id;
    target_obj->map_x = actor->map_x;
    target_obj->map_y = actor->map_y;
    target_obj->map_z = actor->map_z;
    out_result->code = U6_INTERACT_OK;
    out_result->event = U6_EVENT_TOOK;
    out_result->affected_id = target_obj->object_id;
    return out_result->code;
  }

  if (request->verb == U6_INTERACT_DROP) {
    U6ObjectState *target_obj = u6_entities_find_object(state, request->target_id);
    if (target_obj == NULL) {
      out_result->code = U6_INTERACT_ERR_NOT_FOUND;
      return out_result->code;
    }
    if (!is_actor_owned_item(target_obj, actor->npc_id)) {
      out_result->code = U6_INTERACT_ERR_BLOCKED;
      return out_result->code;
    }
    target_obj->status = u6_obj_status_to_locxyz(target_obj->status);
    target_obj->holder_kind = U6_OBJECT_HOLDER_NONE;
    target_obj->holder_id = 0;
    target_obj->map_x = actor->map_x;
    target_obj->map_y = actor->map_y;
    target_obj->map_z = actor->map_z;
    out_result->code = U6_INTERACT_OK;
    out_result->event = U6_EVENT_DROPPED;
    out_result->affected_id = target_obj->object_id;
    return out_result->code;
  }

  if (request->verb == U6_INTERACT_PUT) {
    U6ObjectState *target_obj = u6_entities_find_object(state, request->target_id);
    U6ObjectState *container = u6_entities_find_object(state, request->aux_target_id);
    if (target_obj == NULL || container == NULL) {
      out_result->code = U6_INTERACT_ERR_NOT_FOUND;
      return out_result->code;
    }
    if (!is_actor_owned_item(target_obj, actor->npc_id)) {
      out_result->code = U6_INTERACT_ERR_BLOCKED;
      return out_result->code;
    }
    if (!in_object_range(actor, container) || !container_allows_access(container)) {
      out_result->code = U6_INTERACT_ERR_RANGE;
      return out_result->code;
    }
    target_obj->status = u6_obj_status_to_contained(target_obj->status);
    target_obj->holder_kind = U6_OBJECT_HOLDER_OBJECT;
    target_obj->holder_id = container->object_id;
    target_obj->map_x = container->map_x;
    target_obj->map_y = container->map_y;
    target_obj->map_z = container->map_z;
    out_result->code = U6_INTERACT_OK;
    out_result->event = U6_EVENT_PUT;
    out_result->affected_id = target_obj->object_id;
    return out_result->code;
  }

  if (request->verb == U6_INTERACT_EQUIP) {
    U6ObjectState *target_obj = u6_entities_find_object(state, request->target_id);
    if (target_obj == NULL) {
      out_result->code = U6_INTERACT_ERR_NOT_FOUND;
      return out_result->code;
    }
    if (!u6_obj_status_is_inventory(target_obj->status)
        || target_obj->holder_kind != U6_OBJECT_HOLDER_NPC
        || target_obj->holder_id != actor->npc_id) {
      out_result->code = U6_INTERACT_ERR_BLOCKED;
      return out_result->code;
    }
    if ((target_obj->flags & U6_OBJECT_FLAG_EQUIPPABLE) == 0u) {
      out_result->code = U6_INTERACT_ERR_BLOCKED;
      return out_result->code;
    }
    target_obj->status = u6_obj_status_to_equip(target_obj->status);
    out_result->code = U6_INTERACT_OK;
    out_result->event = U6_EVENT_EQUIPPED;
    out_result->affected_id = target_obj->object_id;
    return out_result->code;
  }

  out_result->code = U6_INTERACT_ERR_INVALID;
  return out_result->code;
}
