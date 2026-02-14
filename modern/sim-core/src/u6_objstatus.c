#include "u6_objstatus.h"

uint8_t u6_obj_status_coord_use(uint8_t status) {
  return (uint8_t)(status & U6_OBJ_STATUS_COORD_USE_MASK);
}

int u6_obj_status_is_locxyz(uint8_t status) {
  return u6_obj_status_coord_use(status) == U6_OBJ_COORD_USE_LOCXYZ;
}

int u6_obj_status_is_contained(uint8_t status) {
  return u6_obj_status_coord_use(status) == U6_OBJ_COORD_USE_CONTAINED;
}

int u6_obj_status_is_inventory(uint8_t status) {
  return u6_obj_status_coord_use(status) == U6_OBJ_COORD_USE_INVEN;
}

int u6_obj_status_is_equip(uint8_t status) {
  return u6_obj_status_coord_use(status) == U6_OBJ_COORD_USE_EQUIP;
}

uint8_t u6_obj_status_with_coord_use(uint8_t status, uint8_t coord_use) {
  uint8_t next = (uint8_t)(status & (uint8_t)(~U6_OBJ_STATUS_COORD_USE_MASK));
  return (uint8_t)(next | (coord_use & U6_OBJ_STATUS_COORD_USE_MASK));
}

uint8_t u6_obj_status_to_locxyz(uint8_t status) {
  return u6_obj_status_with_coord_use(status, U6_OBJ_COORD_USE_LOCXYZ);
}

uint8_t u6_obj_status_to_contained(uint8_t status) {
  return u6_obj_status_with_coord_use(status, U6_OBJ_COORD_USE_CONTAINED);
}

uint8_t u6_obj_status_to_inventory(uint8_t status) {
  return u6_obj_status_with_coord_use(status, U6_OBJ_COORD_USE_INVEN);
}

uint8_t u6_obj_status_to_equip(uint8_t status) {
  return u6_obj_status_with_coord_use(status, U6_OBJ_COORD_USE_EQUIP);
}
