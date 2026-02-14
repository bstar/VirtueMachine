#include "u6_assoc_chain.h"
#include "u6_objstatus.h"

#include <string.h>

static const U6AssocChainNode *find_node(const U6AssocChainNode *nodes, size_t count, int key) {
  size_t i;
  for (i = 0; i < count; i++) {
    if (nodes[i].key == key) {
      return &nodes[i];
    }
  }
  return NULL;
}

static int seen_contains(const int *seen, size_t seen_len, int key) {
  size_t i;
  for (i = 0; i < seen_len; i++) {
    if (seen[i] == key) {
      return 1;
    }
  }
  return 0;
}

int u6_assoc_chain_analyze(const U6AssocChainNode *nodes,
                           size_t count,
                           int target_key,
                           U6AssocChainResult *out) {
  const U6AssocChainNode *target;
  const U6AssocChainNode *current;
  int seen[33];
  size_t seen_len;
  size_t depth;

  if (nodes == NULL || count == 0 || out == NULL || target_key == 0) {
    return U6_ASSOC_CHAIN_ERR_BAD_INPUT;
  }

  memset(out, 0, sizeof(*out));
  target = find_node(nodes, count, target_key);
  if (target == NULL) {
    return U6_ASSOC_CHAIN_ERR_TARGET_NOT_FOUND;
  }

  out->root_anchor_key = target_key;
  if (!u6_obj_status_is_contained(target->status)) {
    out->chain_accessible = u6_obj_status_is_locxyz(target->status) ? 1 : 0;
    return U6_ASSOC_CHAIN_OK;
  }

  current = target;
  seen[0] = target_key;
  seen_len = 1;

  for (depth = 0; depth < 32; depth++) {
    const U6AssocChainNode *parent;
    int parent_key;

    parent_key = current->holder_key;
    if (parent_key == 0) {
      out->missing_parent = 1;
      out->blocked_by_key = 0;
      break;
    }
    if (seen_contains(seen, seen_len, parent_key)) {
      out->cycle_detected = 1;
      out->blocked_by_key = parent_key;
      break;
    }

    parent = find_node(nodes, count, parent_key);
    if (parent == NULL) {
      out->missing_parent = 1;
      out->blocked_by_key = parent_key;
      break;
    }

    if (out->chain_len < (sizeof(out->chain_keys) / sizeof(out->chain_keys[0]))) {
      out->chain_keys[out->chain_len] = parent_key;
      out->chain_len += 1;
    }
    out->root_anchor_key = parent_key;

    if (u6_obj_status_is_locxyz(parent->status)) {
      out->chain_accessible = 1;
      out->blocked_by_key = 0;
      break;
    }
    if (!u6_obj_status_is_contained(parent->status)) {
      out->parent_owned = 1;
      out->blocked_by_key = parent_key;
      break;
    }

    if (seen_len < (sizeof(seen) / sizeof(seen[0]))) {
      seen[seen_len] = parent_key;
      seen_len += 1;
    }
    current = parent;
  }

  return U6_ASSOC_CHAIN_OK;
}
