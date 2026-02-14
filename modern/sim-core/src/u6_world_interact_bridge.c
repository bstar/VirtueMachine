#include "u6_world_interact_bridge.h"
#include "u6_objstatus.h"

#define U6_HOLDER_NONE 0u
#define U6_HOLDER_OBJECT 1u
#define U6_HOLDER_NPC 2u

int u6_world_interact_apply(const U6WorldInteractInput *in, U6WorldInteractResult *out) {
  uint8_t use;

  if (in == 0 || out == 0) {
    return U6_WORLD_INTERACT_ERR_BAD_VERB;
  }

  out->code = U6_WORLD_INTERACT_ERR_BAD_VERB;
  out->status = in->status;
  out->holder_kind = in->holder_kind;

  use = u6_obj_status_coord_use(in->status);
  switch (in->verb) {
    case U6_WORLD_INTERACT_TAKE:
      if (use != U6_OBJ_COORD_USE_LOCXYZ && use != U6_OBJ_COORD_USE_CONTAINED) {
        out->code = U6_WORLD_INTERACT_ERR_BLOCKED;
        return out->code;
      }
      if (use == U6_OBJ_COORD_USE_CONTAINED && in->chain_accessible == 0) {
        out->code = U6_WORLD_INTERACT_ERR_CONTAINER;
        return out->code;
      }
      out->code = U6_WORLD_INTERACT_OK;
      out->status = u6_obj_status_to_inventory(in->status);
      out->holder_kind = U6_HOLDER_NPC;
      return out->code;

    case U6_WORLD_INTERACT_DROP:
      if ((use != U6_OBJ_COORD_USE_INVEN && use != U6_OBJ_COORD_USE_EQUIP)
          || in->holder_kind != U6_HOLDER_NPC
          || in->owner_matches_actor == 0) {
        out->code = U6_WORLD_INTERACT_ERR_BLOCKED;
        return out->code;
      }
      out->code = U6_WORLD_INTERACT_OK;
      out->status = u6_obj_status_to_locxyz(in->status);
      out->holder_kind = U6_HOLDER_NONE;
      return out->code;

    case U6_WORLD_INTERACT_EQUIP:
      if (use != U6_OBJ_COORD_USE_INVEN
          || in->holder_kind != U6_HOLDER_NPC
          || in->owner_matches_actor == 0) {
        out->code = U6_WORLD_INTERACT_ERR_BLOCKED;
        return out->code;
      }
      out->code = U6_WORLD_INTERACT_OK;
      out->status = u6_obj_status_to_equip(in->status);
      out->holder_kind = U6_HOLDER_NPC;
      return out->code;

    case U6_WORLD_INTERACT_PUT:
      if (in->has_container == 0) {
        out->code = U6_WORLD_INTERACT_ERR_CONTAINER;
        return out->code;
      }
      if ((use != U6_OBJ_COORD_USE_INVEN && use != U6_OBJ_COORD_USE_EQUIP)
          || in->holder_kind != U6_HOLDER_NPC
          || in->owner_matches_actor == 0) {
        out->code = U6_WORLD_INTERACT_ERR_BLOCKED;
        return out->code;
      }
      out->code = U6_WORLD_INTERACT_OK;
      out->status = u6_obj_status_to_contained(in->status);
      out->holder_kind = U6_HOLDER_OBJECT;
      return out->code;

    default:
      out->code = U6_WORLD_INTERACT_ERR_BAD_VERB;
      return out->code;
  }
}
