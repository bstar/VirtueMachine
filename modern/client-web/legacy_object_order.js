const OBJ_COORD_USE_LOCXYZ = 0x00;
const OBJ_COORD_USE_CONTAINED = 0x08;
const OBJ_STATUS_IS_0010 = 0x10;

function coordUseOf(obj) {
  return (obj && Number.isFinite(obj.coordUse)) ? (obj.coordUse & 0x18) : OBJ_COORD_USE_LOCXYZ;
}

function is0010(obj) {
  const status = (obj && Number.isFinite(obj.status)) ? (obj.status | 0) : 0;
  return (status & OBJ_STATUS_IS_0010) !== 0;
}

function resolveAssoc(obj) {
  if (!obj) {
    return obj;
  }
  if (obj.assocObj && typeof obj.assocObj === "object") {
    return obj.assocObj;
  }
  return obj;
}

function resolveContainedAnchor(obj) {
  let cur = obj;
  const seen = new Set();
  while (cur && coordUseOf(cur) === OBJ_COORD_USE_CONTAINED && !seen.has(cur)) {
    seen.add(cur);
    const next = resolveAssoc(cur);
    if (!next || next === cur) {
      break;
    }
    cur = next;
  }
  return cur || obj;
}

/*
 Legacy comparator model from C_1184_29C4.
 This function intentionally returns 0 for same-anchor same-position ties.
*/
export function compareLegacyObjectOrderStrict(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  let assocA = resolveContainedAnchor(a);
  let assocB = resolveContainedAnchor(b);

  if (coordUseOf(assocA) !== OBJ_COORD_USE_LOCXYZ && coordUseOf(b) === OBJ_COORD_USE_LOCXYZ) {
    return -1;
  }
  if (coordUseOf(assocB) !== OBJ_COORD_USE_LOCXYZ && coordUseOf(a) === OBJ_COORD_USE_LOCXYZ) {
    return 1;
  }
  if (is0010(assocA)) {
    assocA = resolveAssoc(assocA);
  }
  if (is0010(assocB)) {
    assocB = resolveAssoc(assocB);
  }

  let dist = (assocA.y | 0) - (assocB.y | 0);
  if (dist === 0) {
    dist = (assocA.x | 0) - (assocB.x | 0);
  }
  if (dist === 0) {
    dist = (assocB.z | 0) - (assocA.z | 0);
  }
  if (assocA === assocB) {
    if (coordUseOf(assocA) === OBJ_COORD_USE_LOCXYZ) {
      dist = -1;
    } else if (coordUseOf(assocB) === OBJ_COORD_USE_LOCXYZ) {
      dist = 1;
    }
  }
  return dist | 0;
}

/*
 Deterministic comparator used by modern arrays/sort sites when strict legacy
 compare ties, without changing primary legacy precedence rules.
*/
export function compareLegacyObjectOrderStable(a, b) {
  const base = compareLegacyObjectOrderStrict(a, b);
  if (base !== 0) {
    return base;
  }
  const areaA = Number(a && a.sourceArea) | 0;
  const areaB = Number(b && b.sourceArea) | 0;
  if (areaA !== areaB) {
    return areaA - areaB;
  }
  const idxA = Number((a && (a.sourceIndex ?? a.order)) ?? 0) | 0;
  const idxB = Number((b && (b.sourceIndex ?? b.order)) ?? 0) | 0;
  if (idxA !== idxB) {
    return idxA - idxB;
  }
  const orderA = Number((a && a.order) ?? 0) | 0;
  const orderB = Number((b && b.order) ?? 0) | 0;
  return orderA - orderB;
}
