#include "u6_world_interact_bridge.h"
#include "u6_objstatus.h"

#include <stdio.h>
#include <string.h>

static int fail(const char *msg) {
  fprintf(stderr, "%s\n", msg);
  return 1;
}

int main(void) {
  U6WorldInteractInput in;
  U6WorldInteractResult out;

  memset(&in, 0, sizeof(in));
  in.verb = U6_WORLD_INTERACT_TAKE;
  in.status = u6_obj_status_to_locxyz(0);
  in.holder_kind = 0;
  in.owner_matches_actor = 1;
  in.has_container = 0;
  in.chain_accessible = 1;
  if (u6_world_interact_apply(&in, &out) != U6_WORLD_INTERACT_OK) {
    return fail("take should succeed");
  }
  if (!u6_obj_status_is_inventory(out.status) || out.holder_kind != 2) {
    return fail("take output mismatch");
  }

  in.verb = U6_WORLD_INTERACT_EQUIP;
  in.status = out.status;
  in.holder_kind = out.holder_kind;
  if (u6_world_interact_apply(&in, &out) != U6_WORLD_INTERACT_OK) {
    return fail("equip should succeed");
  }
  if (!u6_obj_status_is_equip(out.status) || out.holder_kind != 2) {
    return fail("equip output mismatch");
  }

  in.verb = U6_WORLD_INTERACT_PUT;
  in.status = out.status;
  in.holder_kind = out.holder_kind;
  in.has_container = 1;
  in.container_cycle = 0;
  if (u6_world_interact_apply(&in, &out) != U6_WORLD_INTERACT_OK) {
    return fail("put should succeed");
  }
  if (!u6_obj_status_is_contained(out.status) || out.holder_kind != 1) {
    return fail("put output mismatch");
  }

  in.verb = U6_WORLD_INTERACT_DROP;
  in.status = out.status;
  in.holder_kind = out.holder_kind;
  in.owner_matches_actor = 1;
  if (u6_world_interact_apply(&in, &out) != U6_WORLD_INTERACT_ERR_BLOCKED) {
    return fail("drop should be blocked from contained/object holder");
  }

  in.verb = U6_WORLD_INTERACT_TAKE;
  in.status = u6_obj_status_to_contained(0);
  in.holder_kind = 1;
  in.chain_accessible = 0;
  if (u6_world_interact_apply(&in, &out) != U6_WORLD_INTERACT_ERR_CONTAINER) {
    return fail("take from contained should fail when chain inaccessible");
  }
  in.chain_accessible = 1;
  if (u6_world_interact_apply(&in, &out) != U6_WORLD_INTERACT_OK) {
    return fail("take from contained should succeed");
  }
  if (!u6_obj_status_is_inventory(out.status) || out.holder_kind != 2) {
    return fail("take contained output mismatch");
  }

  in.verb = U6_WORLD_INTERACT_PUT;
  in.status = out.status;
  in.holder_kind = out.holder_kind;
  in.owner_matches_actor = 1;
  in.has_container = 1;
  in.chain_accessible = 1;
  in.container_cycle = 1;
  if (u6_world_interact_apply(&in, &out) != U6_WORLD_INTERACT_ERR_CONTAINER_CYCLE) {
    return fail("put should fail for container cycle");
  }
  in.container_cycle = 0;

  in.verb = U6_WORLD_INTERACT_DROP;
  in.status = out.status;
  in.holder_kind = out.holder_kind;
  if (u6_world_interact_apply(&in, &out) != U6_WORLD_INTERACT_OK) {
    return fail("drop from inventory should succeed");
  }
  if (!u6_obj_status_is_locxyz(out.status) || out.holder_kind != 0) {
    return fail("drop output mismatch");
  }

  printf("test_u6_world_interact_bridge: ok\n");
  return 0;
}
