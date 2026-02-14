#ifndef U6M_U6_WORLD_INTERACT_BRIDGE_H
#define U6M_U6_WORLD_INTERACT_BRIDGE_H

#include <stdint.h>

typedef enum U6WorldInteractVerb {
  U6_WORLD_INTERACT_TAKE = 1,
  U6_WORLD_INTERACT_DROP = 2,
  U6_WORLD_INTERACT_EQUIP = 3,
  U6_WORLD_INTERACT_PUT = 4
} U6WorldInteractVerb;

typedef enum U6WorldInteractCode {
  U6_WORLD_INTERACT_OK = 0,
  U6_WORLD_INTERACT_ERR_BAD_VERB = -1,
  U6_WORLD_INTERACT_ERR_BLOCKED = -2,
  U6_WORLD_INTERACT_ERR_CONTAINER = -3,
  U6_WORLD_INTERACT_ERR_CONTAINER_CYCLE = -4
} U6WorldInteractCode;

typedef struct U6WorldInteractInput {
  uint8_t verb;
  uint8_t status;
  uint8_t holder_kind;
  uint8_t owner_matches_actor;
  uint8_t has_container;
  uint8_t chain_accessible;
  uint8_t container_cycle;
} U6WorldInteractInput;

typedef struct U6WorldInteractResult {
  int code;
  uint8_t status;
  uint8_t holder_kind;
} U6WorldInteractResult;

int u6_world_interact_apply(const U6WorldInteractInput *in, U6WorldInteractResult *out);

#endif
