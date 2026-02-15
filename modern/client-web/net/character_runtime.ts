export type CharacterRuntimeRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<any>;

export async function performNetEnsureCharacter(
  characterName: string,
  request: CharacterRuntimeRequest
): Promise<{ characterId: string; characterName: string }> {
  const desiredName = String(characterName || "").trim() || "Avatar";
  const list = await request("/api/characters", { method: "GET" }, true);
  const chars = Array.isArray(list?.characters) ? list.characters : [];
  let pick = chars.find(
    (c: any) => String(c?.name || "").toLowerCase() === desiredName.toLowerCase()
  );
  if (!pick) {
    pick = await request("/api/characters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: desiredName })
    }, true);
  }
  return {
    characterId: String(pick?.character_id || ""),
    characterName: desiredName
  };
}
