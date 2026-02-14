#include "u6_assoc_chain.h"
#include "u6_objstatus.h"

#include <stdio.h>
#include <string.h>

static int fail(const char *msg) {
  fprintf(stderr, "%s\n", msg);
  return 1;
}

static U6AssocChainNode node(int key, unsigned status, int holder_kind, int holder_key) {
  U6AssocChainNode n;
  n.key = key;
  n.status = (unsigned char)(status & 0xffu);
  n.holder_kind = (unsigned char)(holder_kind & 0xffu);
  n.holder_key = holder_key;
  return n;
}

int main(void) {
  U6AssocChainResult out;
  U6AssocChainNode nodes[40];
  int rc;
  int i;

  nodes[0] = node(10, u6_obj_status_to_locxyz(0), U6_ASSOC_CHAIN_HOLDER_NONE, 0);
  rc = u6_assoc_chain_analyze(nodes, 1, 10, &out);
  if (rc != U6_ASSOC_CHAIN_OK) return fail("locxyz: expected ok");
  if (out.chain_accessible != 1 || out.chain_len != 0 || out.root_anchor_key != 10) {
    return fail("locxyz: expected accessible self-root");
  }

  nodes[0] = node(20, u6_obj_status_to_contained(0), U6_ASSOC_CHAIN_HOLDER_OBJECT, 21);
  nodes[1] = node(21, u6_obj_status_to_locxyz(0), U6_ASSOC_CHAIN_HOLDER_NONE, 0);
  rc = u6_assoc_chain_analyze(nodes, 2, 20, &out);
  if (rc != U6_ASSOC_CHAIN_OK) return fail("contained->locxyz: expected ok");
  if (out.chain_accessible != 1 || out.chain_len != 1 || out.chain_keys[0] != 21 || out.root_anchor_key != 21) {
    return fail("contained->locxyz: expected single-link accessible chain");
  }

  nodes[0] = node(30, u6_obj_status_to_contained(0), U6_ASSOC_CHAIN_HOLDER_OBJECT, 0);
  rc = u6_assoc_chain_analyze(nodes, 1, 30, &out);
  if (rc != U6_ASSOC_CHAIN_OK) return fail("missing-parent-ref: expected ok");
  if (out.chain_accessible != 0 || out.missing_parent != 1 || out.blocked_by_key != 0) {
    return fail("missing-parent-ref: expected missing parent without key");
  }

  nodes[0] = node(40, u6_obj_status_to_contained(0), U6_ASSOC_CHAIN_HOLDER_OBJECT, 99);
  rc = u6_assoc_chain_analyze(nodes, 1, 40, &out);
  if (rc != U6_ASSOC_CHAIN_OK) return fail("missing-parent-key: expected ok");
  if (out.chain_accessible != 0 || out.missing_parent != 1 || out.blocked_by_key != 99) {
    return fail("missing-parent-key: expected missing parent with key");
  }

  nodes[0] = node(50, u6_obj_status_to_contained(0), U6_ASSOC_CHAIN_HOLDER_OBJECT, 51);
  nodes[1] = node(51, u6_obj_status_to_inventory(0), U6_ASSOC_CHAIN_HOLDER_NPC, 1);
  rc = u6_assoc_chain_analyze(nodes, 2, 50, &out);
  if (rc != U6_ASSOC_CHAIN_OK) return fail("parent-owned: expected ok");
  if (out.chain_accessible != 0 || out.parent_owned != 1 || out.blocked_by_key != 51) {
    return fail("parent-owned: expected inventory/equip parent block");
  }

  nodes[0] = node(60, u6_obj_status_to_contained(0), U6_ASSOC_CHAIN_HOLDER_OBJECT, 61);
  nodes[1] = node(61, u6_obj_status_to_contained(0), U6_ASSOC_CHAIN_HOLDER_OBJECT, 60);
  rc = u6_assoc_chain_analyze(nodes, 2, 60, &out);
  if (rc != U6_ASSOC_CHAIN_OK) return fail("cycle: expected ok");
  if (out.chain_accessible != 0 || out.cycle_detected != 1 || out.blocked_by_key != 60) {
    return fail("cycle: expected cycle detect on return edge");
  }

  for (i = 0; i < 34; i++) {
    int holder = (i == 33) ? 0 : (100 + i + 1);
    nodes[i] = node(100 + i, u6_obj_status_to_contained(0), U6_ASSOC_CHAIN_HOLDER_OBJECT, holder);
  }
  rc = u6_assoc_chain_analyze(nodes, 34, 100, &out);
  if (rc != U6_ASSOC_CHAIN_OK) return fail("max-depth: expected ok");
  if (out.chain_accessible != 0 || out.cycle_detected || out.missing_parent || out.parent_owned) {
    return fail("max-depth: expected unresolved chain without explicit block flags");
  }
  if (out.chain_len != 32 || out.root_anchor_key != 132) {
    return fail("max-depth: expected bounded chain traversal");
  }

  rc = u6_assoc_chain_analyze(nodes, 34, 9999, &out);
  if (rc != U6_ASSOC_CHAIN_ERR_TARGET_NOT_FOUND) {
    return fail("target-not-found: expected error code");
  }

  printf("test_u6_assoc_chain: ok\n");
  return 0;
}
