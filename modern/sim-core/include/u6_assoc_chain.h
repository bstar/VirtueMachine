#ifndef U6M_U6_ASSOC_CHAIN_H
#define U6M_U6_ASSOC_CHAIN_H

#include <stddef.h>
#include <stdint.h>

enum {
  U6_ASSOC_CHAIN_HOLDER_NONE = 0,
  U6_ASSOC_CHAIN_HOLDER_OBJECT = 1,
  U6_ASSOC_CHAIN_HOLDER_NPC = 2
};

typedef struct U6AssocChainNode {
  int key;
  uint8_t status;
  uint8_t holder_kind;
  int holder_key;
} U6AssocChainNode;

typedef struct U6AssocChainResult {
  int root_anchor_key;
  int blocked_by_key;
  int chain_accessible;
  int cycle_detected;
  int missing_parent;
  int parent_owned;
  int chain_keys[32];
  size_t chain_len;
} U6AssocChainResult;

enum {
  U6_ASSOC_CHAIN_OK = 0,
  U6_ASSOC_CHAIN_ERR_BAD_INPUT = -1,
  U6_ASSOC_CHAIN_ERR_TARGET_NOT_FOUND = -2
};

int u6_assoc_chain_analyze(const U6AssocChainNode *nodes,
                           size_t count,
                           int target_key,
                           U6AssocChainResult *out);

#endif
