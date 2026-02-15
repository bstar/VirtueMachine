export type WorldRuntimeRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<any>;

export function collectWorldItemsForMaintenanceFromLayer(objectLayer: any): Array<{
  item_id: string;
  reachable: boolean;
  at: { x: number; y: number; z: number };
}> {
  if (!objectLayer || !objectLayer.byCoord) {
    return [];
  }
  const worldItems = [];
  for (const list of objectLayer.byCoord.values()) {
    for (const obj of list) {
      const typeHex = (obj.type & 0x3ff).toString(16).padStart(3, "0");
      worldItems.push({
        item_id: `item_type_0x${typeHex}`,
        reachable: true,
        at: { x: obj.x | 0, y: obj.y | 0, z: obj.z | 0 }
      });
    }
  }
  return worldItems;
}

export async function requestCriticalMaintenance(
  payload: {
    tick: number;
    world_items: Array<{
      item_id: string;
      reachable: boolean;
      at: { x: number; y: number; z: number };
    }>;
  },
  request: WorldRuntimeRequest
): Promise<any[]> {
  const out = await request("/api/world/critical-items/maintenance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }, true);
  return Array.isArray(out?.events) ? out.events : [];
}

export async function requestWorldObjectsAtCell(
  x: number,
  y: number,
  z: number,
  request: WorldRuntimeRequest
): Promise<any> {
  const out = await request(
    `/api/world/objects?x=${encodeURIComponent(x | 0)}&y=${encodeURIComponent(y | 0)}&z=${encodeURIComponent(z | 0)}&radius=0&limit=128&projection=footprint&include_footprint=1`,
    { method: "GET" },
    true
  );
  return out && typeof out === "object" ? out : null;
}
