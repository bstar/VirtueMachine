#include "u6_world_interact_bridge.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int parse_holder_kind(const char *v) {
  if (v == NULL) {
    return 0;
  }
  if (strcmp(v, "none") == 0) {
    return 0;
  }
  if (strcmp(v, "object") == 0) {
    return 1;
  }
  if (strcmp(v, "npc") == 0) {
    return 2;
  }
  return 0;
}

static const char *holder_kind_name(int k) {
  if (k == 1) {
    return "object";
  }
  if (k == 2) {
    return "npc";
  }
  return "none";
}

static int parse_verb(const char *v) {
  if (v == NULL) {
    return 0;
  }
  if (strcmp(v, "take") == 0) {
    return U6_WORLD_INTERACT_TAKE;
  }
  if (strcmp(v, "drop") == 0) {
    return U6_WORLD_INTERACT_DROP;
  }
  if (strcmp(v, "equip") == 0) {
    return U6_WORLD_INTERACT_EQUIP;
  }
  if (strcmp(v, "put") == 0) {
    return U6_WORLD_INTERACT_PUT;
  }
  return 0;
}

int main(int argc, char **argv) {
  U6WorldInteractInput in;
  U6WorldInteractResult out;

  if (argc != 8) {
    fprintf(stderr, "usage: %s <verb> <status_u8> <holder_kind:none|object|npc> <owner_matches:0|1> <has_container:0|1> <chain_accessible:0|1> <container_cycle:0|1>\n", argv[0]);
    return 2;
  }

  memset(&in, 0, sizeof(in));
  in.verb = (uint8_t)parse_verb(argv[1]);
  in.status = (uint8_t)(strtoul(argv[2], NULL, 0) & 0xffu);
  in.holder_kind = (uint8_t)(parse_holder_kind(argv[3]) & 0xffu);
  in.owner_matches_actor = (uint8_t)((strtoul(argv[4], NULL, 0) != 0) ? 1u : 0u);
  in.has_container = (uint8_t)((strtoul(argv[5], NULL, 0) != 0) ? 1u : 0u);
  in.chain_accessible = (uint8_t)((strtoul(argv[6], NULL, 0) != 0) ? 1u : 0u);
  in.container_cycle = (uint8_t)((strtoul(argv[7], NULL, 0) != 0) ? 1u : 0u);

  out.code = U6_WORLD_INTERACT_ERR_BAD_VERB;
  out.status = in.status;
  out.holder_kind = in.holder_kind;
  (void)u6_world_interact_apply(&in, &out);

  printf("code=%d status=%u holder_kind=%s\n",
         out.code,
         (unsigned)(out.status & 0xffu),
         holder_kind_name(out.holder_kind));
  return 0;
}
