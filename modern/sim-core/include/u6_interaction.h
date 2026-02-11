#ifndef U6M_U6_INTERACTION_H
#define U6M_U6_INTERACTION_H

#include <stdint.h>

#include "u6_entities.h"

typedef enum U6InteractionVerb {
  U6_INTERACT_TALK = 1,
  U6_INTERACT_USE = 2,
  U6_INTERACT_OPEN = 3
} U6InteractionVerb;

typedef enum U6InteractionResultCode {
  U6_INTERACT_OK = 0,
  U6_INTERACT_ERR_NULL = -1,
  U6_INTERACT_ERR_NOT_FOUND = -2,
  U6_INTERACT_ERR_RANGE = -3,
  U6_INTERACT_ERR_BLOCKED = -4,
  U6_INTERACT_ERR_INVALID = -5
} U6InteractionResultCode;

typedef enum U6InteractionEvent {
  U6_EVENT_NONE = 0,
  U6_EVENT_TALKED = 1,
  U6_EVENT_USED = 2,
  U6_EVENT_OPENED = 3,
  U6_EVENT_ALREADY_OPEN = 4
} U6InteractionEvent;

typedef struct U6InteractionRequest {
  U6InteractionVerb verb;
  uint16_t actor_npc_id;
  uint16_t target_id;
} U6InteractionRequest;

typedef struct U6InteractionResult {
  int code;
  U6InteractionEvent event;
  uint16_t affected_id;
} U6InteractionResult;

int u6_interaction_apply(U6EntityState *state,
                         const U6InteractionRequest *request,
                         U6InteractionResult *out_result);

#endif
