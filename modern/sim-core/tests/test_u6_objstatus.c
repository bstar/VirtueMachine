#include "u6_objstatus.h"

#include <stdio.h>

static int fail(const char *msg) {
  fprintf(stderr, "%s\n", msg);
  return 1;
}

static int test_coord_use_predicates(void) {
  if (!u6_obj_status_is_locxyz(U6_OBJ_COORD_USE_LOCXYZ)) {
    return fail("locxyz predicate failed");
  }
  if (!u6_obj_status_is_contained(U6_OBJ_COORD_USE_CONTAINED)) {
    return fail("contained predicate failed");
  }
  if (!u6_obj_status_is_inventory(U6_OBJ_COORD_USE_INVEN)) {
    return fail("inventory predicate failed");
  }
  if (!u6_obj_status_is_equip(U6_OBJ_COORD_USE_EQUIP)) {
    return fail("equip predicate failed");
  }
  if (u6_obj_status_is_locxyz(U6_OBJ_COORD_USE_INVEN)) {
    return fail("locxyz false positive");
  }
  if (u6_obj_status_is_inventory(U6_OBJ_COORD_USE_CONTAINED)) {
    return fail("inventory false positive");
  }
  return 0;
}

static int test_exhaustive_transition_matrix(void) {
  static const uint8_t modes[] = {
    U6_OBJ_COORD_USE_LOCXYZ,
    U6_OBJ_COORD_USE_CONTAINED,
    U6_OBJ_COORD_USE_INVEN,
    U6_OBJ_COORD_USE_EQUIP
  };

  for (unsigned status = 0; status <= 0xffu; status++) {
    for (size_t i = 0; i < sizeof(modes) / sizeof(modes[0]); i++) {
      uint8_t mode = modes[i];
      uint8_t expected = (uint8_t)(((uint8_t)status & (uint8_t)(~U6_OBJ_STATUS_COORD_USE_MASK))
                                   | (mode & U6_OBJ_STATUS_COORD_USE_MASK));
      uint8_t actual = u6_obj_status_with_coord_use((uint8_t)status, mode);
      if (actual != expected) {
        return fail("with_coord_use matrix mismatch");
      }
      if (u6_obj_status_coord_use(actual) != mode) {
        return fail("coord_use decode mismatch");
      }
    }
  }
  return 0;
}

static int test_named_transition_helpers(void) {
  uint8_t status = 0xe7u;
  if (u6_obj_status_to_locxyz(status) != u6_obj_status_with_coord_use(status, U6_OBJ_COORD_USE_LOCXYZ)) {
    return fail("to_locxyz mismatch");
  }
  if (u6_obj_status_to_contained(status) != u6_obj_status_with_coord_use(status, U6_OBJ_COORD_USE_CONTAINED)) {
    return fail("to_contained mismatch");
  }
  if (u6_obj_status_to_inventory(status) != u6_obj_status_with_coord_use(status, U6_OBJ_COORD_USE_INVEN)) {
    return fail("to_inventory mismatch");
  }
  if (u6_obj_status_to_equip(status) != u6_obj_status_with_coord_use(status, U6_OBJ_COORD_USE_EQUIP)) {
    return fail("to_equip mismatch");
  }
  return 0;
}

int main(void) {
  int rc;
  rc = test_coord_use_predicates();
  if (rc != 0) {
    return rc;
  }
  rc = test_exhaustive_transition_matrix();
  if (rc != 0) {
    return rc;
  }
  rc = test_named_transition_helpers();
  if (rc != 0) {
    return rc;
  }
  printf("test_u6_objstatus: ok\n");
  return 0;
}
