#ifndef U6M_U6_OBJLIST_H
#define U6M_U6_OBJLIST_H

#include "sim_core.h"

#include <stddef.h>
#include <stdint.h>

/*
 * Legacy savegame\objlist layout boundary (Ultima VI DOS v4.5 observed).
 *
 * The world-state globals block written from obj_2C4A starts at this tail offset.
 * See legacy read/write path in SRC/seg_0C9C.c.
 */
#define U6_OBJLIST_TAIL_OFFSET 0x1BF1u
#define U6_OBJLIST_TAIL_SIZE   0x82u
#define U6_OBJLIST_MIN_SIZE    (U6_OBJLIST_TAIL_OFFSET + U6_OBJLIST_TAIL_SIZE)

int u6_objlist_extract_world(const uint8_t *objlist, size_t objlist_size, SimWorldState *out_world);
int u6_objlist_patch_world(uint8_t *objlist, size_t objlist_size, const SimWorldState *world);

#endif
