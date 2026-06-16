export type RuntimeAssetStatusSummary = {
  animEntryCount?: unknown;
  entityTotalLoaded?: unknown;
  objectFilesLoaded?: unknown;
  objectTotalLoaded?: unknown;
  paletteLoaded?: unknown;
  tileSetLoaded?: unknown;
};

export type RuntimeAssetStatusText = {
  diagClass: "diag ok";
  diagText: string;
  sourceText: "runtime assets" | "runtime assets + palette" | "runtime assets + tile art";
};

export type RuntimeAssetDiagRuntime = {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

export function runtimeAssetStatusTextRuntime(summary: RuntimeAssetStatusSummary): RuntimeAssetStatusText {
  const tileSetLoaded = !!summary.tileSetLoaded;
  const paletteLoaded = !!summary.paletteLoaded;
  if (tileSetLoaded) {
    const objectFilesLoaded = Number(summary.objectFilesLoaded) | 0;
    if (objectFilesLoaded > 0) {
      const objectTotalLoaded = Number(summary.objectTotalLoaded) | 0;
      const animEntryCount = Number(summary.animEntryCount) | 0;
      const entityTotalLoaded = Number(summary.entityTotalLoaded) | 0;
      const entityMsg = entityTotalLoaded > 0
        ? ` Entity layer active (${entityTotalLoaded} objlist actors).`
        : "";
      const animMsg = animEntryCount > 0
        ? ` Animated tile remaps active (${animEntryCount} entries).`
        : "";
      return {
        diagClass: "diag ok",
        sourceText: "runtime assets + tile art",
        diagText: `Runtime assets loaded with tile decoder path. Object overlay active (${objectTotalLoaded} objects from ${objectFilesLoaded} objblk files).${animMsg}${entityMsg}`
      };
    }
    return {
      diagClass: "diag ok",
      sourceText: "runtime assets + tile art",
      diagText: "Runtime assets loaded with tile decoder path (tileindx/masktype/maptiles/objtiles). Rendering bitmap tiles."
    };
  }
  if (paletteLoaded) {
    return {
      diagClass: "diag ok",
      sourceText: "runtime assets + palette",
      diagText: "Runtime assets loaded with u6pal/tileflag decoding. Terrain tint now uses original palette data."
    };
  }
  return {
    diagClass: "diag ok",
    sourceText: "runtime assets",
    diagText: "Runtime assets loaded. Rendering map/chunk data from local runtime directory."
  };
}

export function conversationArchiveDiagRuntime(args: {
  converseALoaded?: unknown;
  converseAValidated?: unknown;
}): RuntimeAssetDiagRuntime | null {
  if (!args.converseALoaded) {
    return {
      diagClass: "diag warn",
      diagText: "Conversation archive converse.a not loaded; talk falls back to tile strings."
    };
  }
  if (!args.converseAValidated) {
    return {
      diagClass: "diag warn",
      diagText: "Conversation archive loaded but failed canonical validation; scripts are disabled for safety."
    };
  }
  return null;
}

export function runtimeAssetFallbackDiagRuntime(reason: unknown): RuntimeAssetDiagRuntime {
  return {
    diagClass: "diag warn",
    diagText: `Fallback active: ${String(reason || "unknown error")}. Run ./modern/tools/validate_assets.sh and ./modern/tools/sync_assets.sh.`
  };
}
