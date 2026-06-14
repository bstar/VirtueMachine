export interface CharacterRuntimeJson {
  [key: string]: unknown;
}

export type CharacterPayload = object & {
  character_id?: unknown;
  name?: unknown;
};

export interface CharacterListPayload extends CharacterRuntimeJson {
  characters?: unknown;
  [key: string]: unknown;
}

export type CharacterRuntimeRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<CharacterRuntimeJson | null>;

export function characterPayloadsFromJsonRuntime(rows: unknown): CharacterPayload[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.filter((row): row is CharacterPayload => !!row && typeof row === "object");
}

export async function performNetEnsureCharacter(
  characterName: string,
  request: CharacterRuntimeRequest
): Promise<{ characterId: string; characterName: string }> {
  const desiredName = String(characterName || "").trim() || "Avatar";
  const list = await request("/api/characters", { method: "GET" }, true);
  const chars = characterPayloadsFromJsonRuntime(list?.characters);
  let pick = chars.find(
    (c) => String(c?.name || "").toLowerCase() === desiredName.toLowerCase()
  );
  if (!pick) {
    const created = await request("/api/characters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: desiredName })
    }, true);
    pick = created && typeof created === "object" ? created : {};
  }
  return {
    characterId: String(pick?.character_id || ""),
    characterName: desiredName
  };
}
