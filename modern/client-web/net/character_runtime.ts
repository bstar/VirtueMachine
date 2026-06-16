import { netJsonPostInitRuntime } from "./request_runtime.ts";

export type CharacterPayload = object & {
  character_id?: unknown;
  name?: unknown;
};

export interface CharacterListPayload {
  characters?: unknown;
}

export type CharacterRuntimeResponse = CharacterListPayload | CharacterPayload;

export type CharacterRuntimeRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<CharacterRuntimeResponse | null>;

export function characterPayloadsFromJsonRuntime(rows: unknown): CharacterPayload[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.filter((row): row is CharacterPayload => {
    if (!row || typeof row !== "object") {
      return false;
    }
    const candidate = row as CharacterPayload;
    return candidate.character_id != null || candidate.name != null;
  });
}

function characterRowsFromResponseRuntime(response: CharacterRuntimeResponse | null | undefined): unknown {
  return response && typeof response === "object"
    ? (response as CharacterListPayload).characters
    : null;
}

export async function performNetEnsureCharacter(
  characterName: string,
  request: CharacterRuntimeRequest
): Promise<{ characterId: string; characterName: string }> {
  const desiredName = String(characterName || "").trim() || "Avatar";
  const list = await request("/api/characters", { method: "GET" }, true);
  const chars = characterPayloadsFromJsonRuntime(characterRowsFromResponseRuntime(list));
  let pick = chars.find(
    (c) => String(c?.name || "").toLowerCase() === desiredName.toLowerCase()
  );
  if (!pick) {
    const created = await request("/api/characters", netJsonPostInitRuntime({ name: desiredName }), true);
    pick = created && typeof created === "object" ? created : {};
  }
  return {
    characterId: String(pick?.character_id || ""),
    characterName: desiredName
  };
}
