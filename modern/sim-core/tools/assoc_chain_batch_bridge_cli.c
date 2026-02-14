#include "u6_assoc_chain.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int parse_holder_kind(const char *v) {
  if (v == NULL || *v == '\0') {
    return U6_ASSOC_CHAIN_HOLDER_NONE;
  }
  if (strcmp(v, "none") == 0 || strcmp(v, "0") == 0) {
    return U6_ASSOC_CHAIN_HOLDER_NONE;
  }
  if (strcmp(v, "object") == 0 || strcmp(v, "1") == 0) {
    return U6_ASSOC_CHAIN_HOLDER_OBJECT;
  }
  if (strcmp(v, "npc") == 0 || strcmp(v, "2") == 0) {
    return U6_ASSOC_CHAIN_HOLDER_NPC;
  }
  return U6_ASSOC_CHAIN_HOLDER_NONE;
}

static int parse_node_arg(const char *arg, U6AssocChainNode *out) {
  char buf[128];
  char *a;
  char *b;
  char *c;
  char *d;
  if (arg == NULL || out == NULL) {
    return 0;
  }
  memset(buf, 0, sizeof(buf));
  strncpy(buf, arg, sizeof(buf) - 1);
  a = strtok(buf, ":");
  b = strtok(NULL, ":");
  c = strtok(NULL, ":");
  d = strtok(NULL, ":");
  if (a == NULL || b == NULL || c == NULL || d == NULL) {
    return 0;
  }
  out->key = (int)strtol(a, NULL, 10);
  out->status = (unsigned char)(strtoul(b, NULL, 0) & 0xffu);
  out->holder_kind = (unsigned char)(parse_holder_kind(c) & 0xff);
  out->holder_key = (int)strtol(d, NULL, 10);
  return out->key != 0;
}

static size_t parse_targets_csv(const char *csv, int *targets, size_t max_targets) {
  char buf[16384];
  char *tok;
  size_t count = 0;
  if (csv == NULL || targets == NULL || max_targets == 0) {
    return 0;
  }
  memset(buf, 0, sizeof(buf));
  strncpy(buf, csv, sizeof(buf) - 1);
  tok = strtok(buf, ",");
  while (tok != NULL && count < max_targets) {
    int key = (int)strtol(tok, NULL, 10);
    if (key != 0) {
      targets[count++] = key;
    }
    tok = strtok(NULL, ",");
  }
  return count;
}

int main(int argc, char **argv) {
  U6AssocChainNode *nodes;
  int targets[8192];
  size_t node_count;
  size_t target_count;
  size_t i;

  if (argc < 3) {
    fprintf(stderr, "usage: %s <target_keys_csv> <node:key:status:holder_kind:holder_key> [...]\n", argv[0]);
    return 2;
  }

  target_count = parse_targets_csv(argv[1], targets, sizeof(targets) / sizeof(targets[0]));
  if (target_count == 0) {
    fprintf(stderr, "no valid target keys\n");
    return 2;
  }

  node_count = (size_t)(argc - 2);
  nodes = (U6AssocChainNode *)calloc(node_count, sizeof(U6AssocChainNode));
  if (nodes == NULL) {
    fprintf(stderr, "allocation failure\n");
    return 2;
  }
  for (i = 0; i < node_count; i++) {
    if (!parse_node_arg(argv[i + 2], &nodes[i])) {
      free(nodes);
      fprintf(stderr, "invalid node format: %s\n", argv[i + 2]);
      return 2;
    }
  }

  for (i = 0; i < target_count; i++) {
    U6AssocChainResult out;
    int rc = u6_assoc_chain_analyze(nodes, node_count, targets[i], &out);
    size_t j;
    printf("target=%d code=%d root_anchor_key=%d blocked_by_key=%d chain_accessible=%d cycle_detected=%d missing_parent=%d parent_owned=%d chain=",
           targets[i],
           rc,
           out.root_anchor_key,
           out.blocked_by_key,
           out.chain_accessible ? 1 : 0,
           out.cycle_detected ? 1 : 0,
           out.missing_parent ? 1 : 0,
           out.parent_owned ? 1 : 0);
    for (j = 0; j < out.chain_len; j++) {
      if (j != 0) {
        putchar(';');
      }
      printf("%d", out.chain_keys[j]);
    }
    putchar('\n');
  }

  free(nodes);
  return 0;
}
