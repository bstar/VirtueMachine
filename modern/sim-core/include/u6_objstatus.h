#ifndef U6M_U6_OBJSTATUS_H
#define U6M_U6_OBJSTATUS_H

#include <stdint.h>

#define U6_OBJ_STATUS_COORD_USE_MASK 0x18u

enum {
  U6_OBJ_COORD_USE_LOCXYZ = 0x00u,
  U6_OBJ_COORD_USE_CONTAINED = 0x08u,
  U6_OBJ_COORD_USE_INVEN = 0x10u,
  U6_OBJ_COORD_USE_EQUIP = 0x18u
};

uint8_t u6_obj_status_coord_use(uint8_t status);
int u6_obj_status_is_locxyz(uint8_t status);
int u6_obj_status_is_contained(uint8_t status);
int u6_obj_status_is_inventory(uint8_t status);
int u6_obj_status_is_equip(uint8_t status);

uint8_t u6_obj_status_with_coord_use(uint8_t status, uint8_t coord_use);
uint8_t u6_obj_status_to_locxyz(uint8_t status);
uint8_t u6_obj_status_to_contained(uint8_t status);
uint8_t u6_obj_status_to_inventory(uint8_t status);
uint8_t u6_obj_status_to_equip(uint8_t status);

#endif
