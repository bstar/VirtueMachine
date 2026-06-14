import {
  buildOverlayCellsModel,
  isLegacyPixelTransparent,
  measureActorOcclusionParityModel,
  topInteractiveOverlayAtModel
} from "./render_composition.ts";
import {
  canvasFromIndexedPixelsRuntime,
  fallbackTileColorRuntime,
  tilePaletteIndexRuntime
} from "./render/indexed_pixels_runtime.ts";
import {
  drawLegacyContinueArrowRuntime,
  drawU6CompactTextRuntime,
  drawU6MainTextRuntime,
  measureU6TextWidthRuntime,
  u6GlyphSpanRuntime
} from "./render/legacy_text_render_runtime.ts";
import { U6TileSetRuntime } from "./render/tile_set_runtime.ts";
import { createU6AudioRuntime } from "./audio/audio_runtime.ts";
import { U6_SFX } from "./audio/sfx_ids_runtime.ts";
import {
  decodeLegacyPixmapRuntime,
  decodeLookLzdEntriesRuntime
} from "./assets/legacy_pixmap_runtime.ts";
import {
  decodePortraitFromArchiveRuntime,
  decodeU6CursorPtrRuntime,
  decodeU6ShapeFromBufferRuntime,
  decodeU6ShpArchiveRuntime
} from "./assets/shape_archive_runtime.ts";
import {
  buildLegacyPaletteFrameRuntime,
  buildPackedIntroPalettesRuntime,
  buildPaletteFromU6PalRuntime,
  buildStartupPaletteForMenuRuntime
} from "./assets/palette_runtime.ts";
import { errorMessageRuntime } from "./error_runtime.ts";
import { compareLegacyObjectOrderStable } from "./legacy_object_order.ts";
import { buildUiProbeContract, uiProbeDigest } from "./ui_probe_contract.ts";
import {
  buildConversationVmContext as buildConversationVmContextImported,
  conversationKeyMatchesInput as conversationKeyMatchesInputImported,
  conversationMacroSymbolToIndex as conversationMacroSymbolToIndexImported,
  conversationWordMatchesPattern as conversationWordMatchesPatternImported,
  renderConversationMacrosWithContext as renderConversationMacrosWithContextImported,
  splitConversationInputWords as splitConversationInputWordsImported
} from "./conversation/text_runtime.ts";
import {
  decodeConversationOpeningLines as decodeConversationOpeningLinesImported,
  decodeConversationOpeningResult as decodeConversationOpeningResultImported,
  decodeConversationResponseBytes as decodeConversationResponseBytesImported,
  decodeConversationResponseOpcodeAware as decodeConversationResponseOpcodeAwareImported
} from "./conversation/vm_runtime.ts";
import {
  findConversationFirstKeyPc as findConversationFirstKeyPcImported,
  parseConversationRules as parseConversationRulesImported
} from "./conversation/rules_runtime.ts";
import {
  canonicalizeOpeningLines as canonicalizeOpeningLinesImported,
  canonicalTalkFallbackGreeting as canonicalTalkFallbackGreetingImported,
  formatYouSeeLine as formatYouSeeLineImported
} from "./conversation/presentation_runtime.ts";
import {
  conversationRunFromKeyCursor as conversationRunFromKeyCursorImported,
  legacyConversationReply as legacyConversationReplyImported
} from "./conversation/dialog_runtime.ts";
import {
  advanceLegacyConversationPagination as advanceLegacyConversationPaginationImported,
  buildDebugChatLedgerText as buildDebugChatLedgerTextImported,
  endLegacyConversation as endLegacyConversationImported,
  handleLegacyConversationKeydown as handleLegacyConversationKeydownImported,
  paginateLedgerMessages as paginateLedgerMessagesImported,
  pushLedgerMessage as pushLedgerMessageImported,
  showLegacyLedgerPrompt as showLegacyLedgerPromptImported,
  startLegacyConversationPagination as startLegacyConversationPaginationImported,
  submitLegacyConversationInput as submitLegacyConversationInputImported,
  wrapLegacyLedgerLines as wrapLegacyLedgerLinesImported
} from "./conversation/session_runtime.ts";
import {
  canonicalConversationHintIdFromSpeakerRuntime,
  conversationHeaderIsPlausibleCanonicalFallbackRuntime,
  conversationHeaderMatchesExpectedCanonicalDescRuntime,
  conversationHeaderMatchesExpectedCanonicalNameRuntime,
  decodeU6LzwWithKnownLengthRuntime,
  isLikelyValidConversationScriptRuntime,
  loadLegacyConversationScriptForNpcRuntime,
  normalizedConversationNameRuntime,
  parseConversationHeaderAndDescRuntime
} from "./conversation/archive_runtime.ts";
import {
  DEFAULT_RUNTIME_EXTENSIONS,
  RUNTIME_PROFILE_CANONICAL_STRICT,
  RUNTIME_PROFILE_CANONICAL_PLUS,
  RUNTIME_PROFILES,
  createDefaultRuntimeExtensions,
  normalizeRuntimeProfile,
  parseRuntimeExtensionListCsv,
  runtimeExtensionsSummary,
  sanitizeRuntimeExtensions
} from "../common/runtime_contract.ts";
import {
  OBJ_COORD_USE_EQUIP,
  OBJ_COORD_USE_LOCXYZ,
  OBJ_COORD_USE_MASK
} from "../common/u6_object_constants.ts";
import { performManagedNetRequest } from "./net/request_runtime.ts";
import { applyNetLoginState, clearNetSessionState } from "./net/session_runtime.ts";
import { performNetLoadSnapshot, performNetSaveSnapshot } from "./net/snapshot_runtime.ts";
import {
  performNetChangePassword,
  performNetRecoverPassword,
  performNetSendEmailVerification,
  performNetSetEmail,
  performNetVerifyEmail
} from "./net/account_runtime.ts";
import {
  applyAuthoritativeWorldClockToSim,
  performPresenceHeartbeat,
  performPresenceLeave,
  performPresencePoll,
  performWorldClockPoll
} from "./net/presence_runtime.ts";
import {
  collectWorldItemsForMaintenanceFromLayer,
  inventoryItemFromTakeResponseRuntime,
  inventoryProjectionFromServerObjectsRuntime,
  requestIntroPhaseRuntime,
  requestTakeWorldObjectRuntime,
  runCriticalMaintenanceRuntime,
  requestWorldObjectsAtCell,
  setIntroPhaseRuntime
} from "./net/world_runtime.ts";
import { performNetEnsureCharacter } from "./net/character_runtime.ts";
import { performNetLogoutSequence } from "./net/logout_runtime.ts";
import { performNetLoginFlow } from "./net/auth_runtime.ts";
import {
  recordBackgroundFailureRuntime,
  resetBackgroundFailureState
} from "./net/failure_runtime.ts";
import {
  applyNetProfileToControlsRuntime,
  countSavedProfilesRuntime,
  loadNetProfilesFromStorage,
  populateNetAccountSelectRuntime,
  profileKey as profileKeyRuntime,
  upsertNetProfileFromControlsRuntime
} from "./net/profile_runtime.ts";
import {
  decodeSimSnapshotBase64Runtime,
  encodeSimSnapshotBase64Runtime
} from "./net/snapshot_codec_runtime.ts";
import { loadNetPanelPrefs, persistNetLoginSettings, setModalOpenRuntime } from "./net/panel_runtime.ts";
import {
  applySelectedAccountProfileRuntime,
  applyNetPanelPrefsToControlsRuntime,
  bindAccountProfileSelectionRuntime,
  bindNetPanelPrefPersistenceRuntime
} from "./net/panel_bindings_runtime.ts";
import { runNetPanelActionRuntime } from "./net/panel_actions_runtime.ts";
import {
  applyNetStatusRuntime,
  pulseNetIndicatorRuntime,
  renderNetAuthButtonRuntime,
  renderNetSessionStatRuntime
} from "./net/status_runtime.ts";
import {
  legacyAttackVerbRuntime,
  legacyCastVerbRuntime,
  legacyDropVerbRuntime,
  legacyMoveVerbRuntime
} from "./gameplay/legacy_verb_runtime.ts";
import {
  advanceWorldMinuteRuntime,
  clampI32Runtime,
  expireRemovedWorldPropsRuntime,
  xorshift32Runtime
} from "./sim/sim_utils_runtime.ts";
import {
  asU32SignedRuntime,
  hashHexRuntime,
  hashMixU32Runtime,
  simStateHashRuntime
} from "./sim/hash_runtime.ts";
import { packCommandRuntime, unpackCommandRuntime } from "./sim/command_wire_runtime.ts";
import { timeOfDayLabelRuntime } from "./sim/time_runtime.ts";
import {
  appendCommandLogRuntime,
  enqueueCommandRuntime,
  filterFutureCommandsOfTypeRuntime,
  partitionCommandsForTickRuntime,
  shouldSuppressRepeatedMoveRuntime,
  upsertMoveCommandForTickRuntime
} from "./sim/queue_runtime.ts";
import {
  createInitialAppSimState,
  toAppSimStateRuntime
} from "./sim/app_state_runtime.ts";
import { applyAvatarMoveCommandRuntime } from "./sim/avatar_move_runtime.ts";
import { U6AnimDataRuntime } from "./sim/anim_data_runtime.ts";
import { U6MapRuntime } from "./sim/map_runtime.ts";
import {
  directionGroupFromDxDyRuntime,
  legacyActorDirectionGroupRuntime,
  legacyActorStandingTileIdRuntime,
  remotePlayerFrameOffsetRuntime
} from "./sim/legacy_actor_frame_runtime.ts";
import {
  applyFurnitureInteractionRuntime,
  bedInteractionScoreRuntime,
  chairFrameForCellRuntime,
  furnitureAtWorldCellRuntime,
  furnitureOccupancyCellsRuntime,
  objectIsBedAtCellRuntime,
  objectIsChairAtCellRuntime,
  preferredSleepCellForBedRuntime,
  sleepBedCellFrameOffsetRuntime,
  sleepFrameOffsetForBedAtCellRuntime
} from "./sim/furniture_pose_runtime.ts";
import {
  isImplicitSolidObjectTileRuntime,
  objectFootprintTilesRuntime
} from "./sim/object_footprint_runtime.ts";
import { isBlockedAtRuntime } from "./sim/collision_runtime.ts";
import {
  doorToggleMessageRuntime,
  isDoorFrameOpenRuntime,
  resolveDoorTileIdRuntime,
  resolvedDoorFrameRuntime,
  toggleDoorStateRuntime
} from "./sim/door_runtime.ts";
import {
  addObjectToInventoryRuntime,
  inventoryKeyForObjectRuntime,
  isObjectRemovedRuntime,
  markObjectRemovedRuntime
} from "./sim/inventory_runtime.ts";
import {
  isBedObjectRuntime,
  isChairObjectRuntime,
  isCloseableDoorObjectRuntime,
  isLikelyPickupObjectTypeRuntime,
  isSolidEnvObjectRuntime
} from "./sim/object_types_runtime.ts";
import { nearestTalkTargetAtCellRuntime, topWorldObjectAtCellRuntime } from "./sim/target_runtime.ts";
import { isWithinChebyshevRangeRuntime } from "./sim/range_runtime.ts";
import {
  BOOT_INTRO_SCENES,
  abortBootIntroRuntime,
  advanceBootIntroInputRuntime,
  advanceBootIntroRuntime,
  activeBootIntroPaletteRuntime,
  bootIntroPaletteCacheKeyRuntime,
  bootIntroWindowSceneBaseRuntime,
  bootIntroWindowStateAtRuntime,
  bootIntroPrintTextOnCardRuntime,
  bootIntroPrintTextRuntime,
  bootIntroClockFramesRuntime,
  bootIntroClockSpritesRuntime,
  bootIntroTvStateAtRuntime,
  bootIntroTvStaticCellsRuntime,
  buildBootIntroTextCardRenderPlanRuntime,
  bootIntroWouCharWidthRuntime,
  decodeBootIntroWouFontRuntime,
  drawBootIntroWouTextRuntime,
  bootIntroOverlayAlphaRuntime,
  createBootIntroRuntimeState,
  currentBootIntroSceneRuntime,
  measureBootIntroTextWidthRuntime,
  startBootIntroRuntime,
  wrapBootIntroTextPixelsRuntime
} from "./ui/boot_intro_runtime.ts";
import {
  normalizeStartupMenuIndexRuntime,
  startupMenuItemEnabledRuntime,
  startupMenuIndexAtSurfacePointRuntime
} from "./ui/startup_runtime.ts";
import {
  areaIdForWorldXYRuntime,
  canonicalLookSentenceForTileRuntime,
  canonicalTalkSpeakerForTileRuntime,
  legacyArticleForTileRuntime,
  legacyLookupTileStringRuntime,
  sanitizeLegacyHudLabelTextRuntime
} from "./ui/legacy_text_runtime.ts";
import {
  cursorDrawRectRuntime,
  cursorLogicalWidthRuntime
} from "./ui/cursor_runtime.ts";
import {
  applyLegacyCornerVariantRuntime,
  buildBaseTileBuffersRuntime,
  buildLegacyViewContextRuntime,
  shouldBlackoutTileRuntime,
  stableCornerVariantRuntime
} from "./ui/legacy_view_tile_runtime.ts";
import { isTypingContextRuntime } from "./ui/input_runtime.ts";
import {
  buildLegacyInventoryPaperdollLayoutRuntime,
  legacyInventoryPaperdollHitTestRuntime
} from "./ui/inventory_paperdoll_layout_runtime.ts";
import { projectLegacyEquipmentSlotsRuntime } from "./ui/paperdoll_equipment_runtime.ts";
import {
  normalizePartyMemberIdsRuntime,
  resolvePartySwitchDigitRuntime
} from "./ui/party_message_runtime.ts";

const TICK_MS = 100;
const LEGACY_PROMPT_FRAME_MS = 120;
const TILE_SIZE = 64;
const VIEW_W = 11;
const VIEW_H = 11;
const COMMAND_WIRE_SIZE = 16;
const COMMAND_LOG_MAX = 50000;
const MOVE_INPUT_MIN_INTERVAL_MS = 120;
const AVATAR_WALK_ANIM_WINDOW_MS = 280;
const NET_PRESENCE_HEARTBEAT_TICKS = 4;
const NET_PRESENCE_POLL_TICKS = 10;
const NET_CLOCK_POLL_TICKS = 2;
const NET_BACKGROUND_FAIL_WINDOW_MS = 12000;
const NET_BACKGROUND_FAIL_MAX = 6;
const LOOP_MAX_CATCHUP_STEPS = 4;
const LOOP_MAX_ACC_MS = TICK_MS * LOOP_MAX_CATCHUP_STEPS;
const RUNTIME_OBJECT_PATH = "../assets/runtime/savegame";
const PRISTINE_OBJECT_PATH = "../assets/pristine/savegame";
const PRISTINE_BASELINE_VERSION_PATH = "../assets/pristine/.baseline_version";
const PRISTINE_BASELINE_POLL_TICKS = 20;
const TICKS_PER_MINUTE = 4;
const WORLD_PROP_RESET_MINUTES = 5;
const WORLD_PROP_RESET_TICKS = WORLD_PROP_RESET_MINUTES * 60 * TICKS_PER_MINUTE;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 28;
const MONTHS_PER_YEAR = 13;
const REPLAY_CHECKPOINT_INTERVAL = 32;
const OBJ_STATUS_INVISIBLE = 0x02;
const OBJ_U6_CLOCK = 0x09f;
const OBJ_U6_FIREPLACE = 0x0a4;
const OBJ_U6_RUBBER_DUCKY = 169;
const OBJ_U6_COOK_FIRE = 0x0c9;
const OBJ_U6_FOUNTAIN = 0x0ea;
const OBJ_U6_BELL = 236;
const OBJ_U6_WATER_WHEEL = 0x11f;
const OBJ_U6_FIRE_FIELD = 0x130;
const OBJ_U6_FIRE = 0x13d;
const OBJ_U6_PROTECTION_FIELD = 0x13f;
const ENTITY_TYPE_ACTOR_MIN = 0x153;
const ENTITY_TYPE_ACTOR_MAX = 0x1af;
const AVATAR_ENTITY_ID = 1;
const LEGACY_SLEEP_SHAPE_TYPE = 0x092;
const NPC_FLAG_DIRECTION_MASK = 0x07;
const NPC_FLAG_WALKING = 0x80;
const OBJECT_TYPES_FLOOR_DECOR = new Set([0x12e, 0x12f, 0x130]);
function isRenderableWorldObjectType(type) {
  const t = type & 0x03ff;
  if (t >= ENTITY_TYPE_ACTOR_MIN && t <= ENTITY_TYPE_ACTOR_MAX) {
    return false;
  }
  /* Legacy ShowObject short-circuits this base tile family. */
  if (t === 0x14f) {
    return false;
  }
  return true;
}

const HASH_OFFSET = 1469598103934665603n;
const HASH_PRIME = 1099511628211n;
const HASH_MASK = (1n << 64n) - 1n;
const HASH_CFG = { offset: HASH_OFFSET, prime: HASH_PRIME, mask: HASH_MASK };
const WORLD_OBJECT_LOOKUP_DEPS = {
  isObjectRemoved: isObjectRemovedRuntime,
  isLikelyPickupObjectType: isLikelyPickupObjectTypeRuntime
};

type UiProbeContract = ReturnType<typeof buildUiProbeContract>;
type UiProbeAvatarRuntime = {
  equip_weight?: number;
  total_weight?: number;
  strength?: number;
  party_index?: number;
};
type UiProbeContractRuntime = UiProbeContract & {
  canonical_ui?: UiProbeContract["canonical_ui"] & {
    conversation_panel?: { target_name?: string | null };
    avatar_panel?: { avatar?: UiProbeAvatarRuntime };
  };
};
type VmDebugWindow = Window & typeof globalThis & {
  __vmLastUiProbe?: UiProbeContractRuntime;
  __vmLastUiProbeDigest?: string;
};

function byId<T = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

const canvas = byId<HTMLCanvasElement>("viewport");
const ctx = canvas.getContext("2d");
const legacyBackdropCanvas = byId<HTMLCanvasElement>("legacyBackdrop");
const legacyViewportCanvas = byId<HTMLCanvasElement>("legacyViewport");
const legacyWorldSurface = byId<HTMLCanvasElement>("legacyWorldSurface");

const statTick = byId("statTick");
const statPos = byId("statPos");
const statClock = byId("statClock");
const statDate = byId("statDate");
const statTile = byId("statTile");
const statObjects = byId("statObjects");
const statEntities = byId("statEntities");
const statRenderParity = byId("statRenderParity");
const statAvatarState = byId("statAvatarState");
const statNpcOcclusionBlocks = byId("statNpcOcclusionBlocks");
const statQueued = byId("statQueued");
const statSource = byId("statSource");
const statHash = byId("statHash");
const statLoopHealth = byId("statLoopHealth");
const statSimLoop = byId("statSimLoop");
const statReplay = byId("statReplay");
const statAudio = byId("statAudio");
const statPalettePhase = byId("statPalettePhase");
const statCenterTiles = byId("statCenterTiles");
const statCenterBand = byId("statCenterBand");
const statNetSession = byId("statNetSession");
const statIntroPhase = byId("statIntroPhase");
const statNetPlayers = byId("statNetPlayers");
const statCriticalRecoveries = byId("statCriticalRecoveries");
const topTimeOfDay = byId("topTimeOfDay");
const topNetStatus = byId("topNetStatus");
const topNetIndicator = byId("topNetIndicator");
const topInputMode = byId("topInputMode");
const topCopyStatus = byId("topCopyStatus");
const netQuickStatus = byId("netQuickStatus");
const netAccountOpenButton = byId<HTMLButtonElement>("netAccountOpenButton");
const netAccountModal = byId("netAccountModal");
const netAccountModalBackdrop = byId("netAccountModalBackdrop");
const netAccountCloseButton = byId<HTMLButtonElement>("netAccountCloseButton");
const diagBox = byId("diagBox");
const replayDownload = byId<HTMLAnchorElement>("replayDownload");
const themeSelect = byId<HTMLSelectElement>("themeSelect");
const wikiLink = byId<HTMLAnchorElement>("wikiLink");
const fontSelect = byId<HTMLSelectElement>("fontSelect");
const gridToggle = byId<HTMLInputElement>("gridToggle");
const debugOverlayToggle = byId<HTMLInputElement>("debugOverlayToggle");
const animationToggle = byId<HTMLInputElement>("animationToggle");
const paletteFxToggle = byId<HTMLInputElement>("paletteFxToggle");
const movementModeToggle = byId<HTMLInputElement>("movementModeToggle");
const capturePreviewToggle = byId<HTMLInputElement>("capturePreviewToggle");
const legacyScaleModeToggle = byId<HTMLInputElement>("legacyScaleModeToggle");
const charStubCanvas = byId<HTMLCanvasElement>("charStubCanvas");
const locationSelect = byId<HTMLSelectElement>("locationSelect");
const jumpButton = byId<HTMLButtonElement>("jumpButton");
const captureButton = byId<HTMLButtonElement>("captureButton");
const captureWorldHudButton = byId<HTMLButtonElement>("captureWorldHudButton");
const audioMuteButton = byId<HTMLButtonElement>("audioMuteButton");
const pauseLoopButton = byId<HTMLButtonElement>("pauseLoopButton");
const parityRadiusInput = byId<HTMLInputElement>("parityRadiusInput");
const paritySnapshotButton = byId<HTMLButtonElement>("paritySnapshotButton");
const netApiBaseInput = byId<HTMLInputElement>("netApiBaseInput");
const netAccountSelect = byId<HTMLSelectElement>("netAccountSelect");
const netUsernameInput = byId<HTMLInputElement>("netUsernameInput");
const netPasswordInput = byId<HTMLInputElement>("netPasswordInput");
const netPasswordToggleButton = byId<HTMLButtonElement>("netPasswordToggleButton");
const netNewPasswordInput = byId<HTMLInputElement>("netNewPasswordInput");
const netChangePasswordButton = byId<HTMLButtonElement>("netChangePasswordButton");
const netCharacterNameInput = byId<HTMLInputElement>("netCharacterNameInput");
const netEmailInput = byId<HTMLInputElement>("netEmailInput");
const netEmailCodeInput = byId<HTMLInputElement>("netEmailCodeInput");
const netLoginButton = byId<HTMLButtonElement>("netLoginButton");
const netAutoLoginCheckbox = byId<HTMLInputElement>("netAutoLoginCheckbox");
const netRecoverButton = byId<HTMLButtonElement>("netRecoverButton");
const netSetEmailButton = byId<HTMLButtonElement>("netSetEmailButton");
const netSendVerifyButton = byId<HTMLButtonElement>("netSendVerifyButton");
const netVerifyEmailButton = byId<HTMLButtonElement>("netVerifyEmailButton");
const netSaveButton = byId<HTMLButtonElement>("netSaveButton");
const netLoadButton = byId<HTMLButtonElement>("netLoadButton");
const netMaintenanceToggle = byId<HTMLSelectElement>("netMaintenanceToggle");
const netIntroPhaseSelect = byId<HTMLSelectElement>("netIntroPhaseSelect");
const netIntroPhaseButton = byId<HTMLButtonElement>("netIntroPhaseButton");
const netMaintenanceButton = byId<HTMLButtonElement>("netMaintenanceButton");
const debugTabRuntime = byId<HTMLButtonElement>("debugTabRuntime");
const debugTabChat = byId<HTMLButtonElement>("debugTabChat");
const debugPanelRuntime = byId("debugPanelRuntime");
const debugPanelChat = byId("debugPanelChat");
const debugChatCount = byId("debugChatCount");
const debugChatLedgerBody = byId("debugChatLedgerBody");
const debugChatCopyButton = byId<HTMLButtonElement>("debugChatCopyButton");
const debugChatClearButton = byId<HTMLButtonElement>("debugChatClearButton");

const THEME_KEY = "vm_theme";
const FONT_KEY = "vm_font";
const GRID_KEY = "vm_grid";
const DEBUG_OVERLAY_KEY = "vm_overlay_debug";
const ANIMATION_KEY = "vm_animation";
const PALETTE_FX_KEY = "vm_palette_fx";
const MOVEMENT_MODE_KEY = "vm_movement_mode";
const LEGACY_FRAME_PREVIEW_KEY = "vm_legacy_frame_preview";
const LEGACY_SCALE_MODE_KEY = "vm_legacy_scale_mode";
const NET_API_BASE_KEY = "vm_net_api_base";
const NET_USERNAME_KEY = "vm_net_username";
const NET_PASSWORD_KEY = "vm_net_password";
const NET_PASSWORD_VISIBLE_KEY = "vm_net_password_visible";
const NET_CHARACTER_NAME_KEY = "vm_net_character_name";
const NET_EMAIL_KEY = "vm_net_email";
const NET_MAINTENANCE_KEY = "vm_net_maintenance";
const NET_AUTO_LOGIN_KEY = "vm_net_auto_login";
const NET_PROFILES_KEY = "vm_net_profiles";
const NET_PROFILE_SELECTED_KEY = "vm_net_profile_selected";
const NET_PROFILE_STORAGE = {
  storageKey: NET_PROFILES_KEY,
  selectedKeyStorageKey: NET_PROFILE_SELECTED_KEY
};
const RUNTIME_PROFILE_KEY = "vm_runtime_profile";
const RUNTIME_EXTENSIONS_KEY = "vm_runtime_extensions";
const NET_ACTIVITY_PULSE_MS = 280;
const LEGACY_UI_MAP_RECT = Object.freeze({ x: 8, y: 8, w: 160, h: 160 });
const LEGACY_FRAME_TILES = Object.freeze({
  cornerTL: 0x1b0,
  top: 0x1b1,
  cornerTR: 0x1b2,
  cornerBL: 0x1b3,
  bottom: 0x1b4,
  cornerBR: 0x1b5,
  left: 0x1b6,
  right: 0x1b7
});
const LEGACY_UI_TILE = Object.freeze({
  SLOT_EMPTY: 0x19a,
  SLOT_OCCUPIED_BG: 0x19b,
  SLOT_2HND_MARK: 0x185,
  BUTTON_ATTACK_BASE: 0x190,
  BUTTON_RIGHT: 0x19e,
  SKY_OUTSIDE_BASE: 0x160,
  CAVE_L: 0x174,
  CAVE_M: 0x175,
  CAVE_R: 0x176,
  EQUIP_UL: 0x170,
  EQUIP_UR: 0x171,
  EQUIP_DL: 0x172,
  EQUIP_DR: 0x173
});
/* C_2FC1_19C5: sun/moons Y arc used by top strip "vista". */
const LEGACY_VISTA_ARC_Y = Object.freeze([10, 7, 5, 3, 2, 1, 0, 0, 0, 1, 2, 3, 5, 7, 10]);
/* seg_0A33:D_036A moon phase pairs by day-of-month (1..28). */
const LEGACY_MOON_PHASE_BY_DAY = Object.freeze([
  [0, 0], [7, 0], [7, 7], [6, 6], [6, 5], [5, 4], [5, 3], [4, 2], [3, 1], [3, 0],
  [2, 0], [2, 7], [1, 6], [1, 5], [0, 4], [7, 3], [7, 2], [6, 1], [6, 0], [5, 0],
  [5, 7], [4, 6], [3, 5], [3, 4], [2, 3], [2, 2], [1, 1], [1, 0]
]);
const LEGACY_POSTURE_ICONS = Object.freeze([0x183, 0x180, 0x181, 0x184, 0x187]);
const LEGACY_HUD_TEXT_COLOR = "#8b3f24";
const LEGACY_AVATAR_PORTRAIT_INDEX = 0;
const STARTUP_MENU = Object.freeze([
  { id: "intro", label: "Introduction", enabled: false },
  { id: "create", label: "Create Character", enabled: false },
  { id: "transfer", label: "Transfer Character", enabled: false },
  { id: "ack", label: "Acknowledgements", enabled: false },
  { id: "journey", label: "Journey Onward", enabled: true }
]);
const LEGACY_TARGET_VERB = Object.freeze({
  ATTACK: "attack",
  CAST: "cast",
  TALK: "talk",
  LOOK: "look",
  GET: "get",
  DROP: "drop",
  MOVE: "move",
  USE: "use"
});
const LEGACY_TARGET_VERB_LABEL = Object.freeze({
  [LEGACY_TARGET_VERB.ATTACK]: "Attack",
  [LEGACY_TARGET_VERB.CAST]: "Cast",
  [LEGACY_TARGET_VERB.TALK]: "Talk",
  [LEGACY_TARGET_VERB.LOOK]: "Look",
  [LEGACY_TARGET_VERB.GET]: "Get",
  [LEGACY_TARGET_VERB.DROP]: "Drop",
  [LEGACY_TARGET_VERB.MOVE]: "Move",
  [LEGACY_TARGET_VERB.USE]: "Use"
});
const LEGACY_VERB_SELECT_RANGE = Object.freeze({
  [LEGACY_TARGET_VERB.ATTACK]: 7,
  [LEGACY_TARGET_VERB.CAST]: 7,
  [LEGACY_TARGET_VERB.TALK]: 7,
  [LEGACY_TARGET_VERB.LOOK]: 7,
  [LEGACY_TARGET_VERB.GET]: -1,
  [LEGACY_TARGET_VERB.DROP]: 7,
  [LEGACY_TARGET_VERB.MOVE]: -1,
  [LEGACY_TARGET_VERB.USE]: -1
});
const LEGACY_STATUS_DISPLAY = Object.freeze({
  CMD_90: 0x90, /* character status */
  CMD_91: 0x91, /* party list / command */
  CMD_92: 0x92, /* equipment + inventory */
  CMD_9E: 0x9e  /* inspect / talk panel */
});
const LEGACY_COMMAND_TYPE = Object.freeze({
  MOVE_AVATAR: 1,
  USE_FACING: 2,
  USE_AT_CELL: 3,
  LOOK_AT_CELL: 4,
  TALK_AT_CELL: 5,
  GET_AT_CELL: 6,
  ATTACK_AT_CELL: 7,
  CAST_AT_CELL: 8,
  DROP_AT_CELL: 9,
  MOVE_AT_CELL: 10,
  USE_VERB_AT_CELL: 11
});
const LEGACY_VERB_COMMAND_TYPE = Object.freeze({
  [LEGACY_TARGET_VERB.ATTACK]: LEGACY_COMMAND_TYPE.ATTACK_AT_CELL,
  [LEGACY_TARGET_VERB.CAST]: LEGACY_COMMAND_TYPE.CAST_AT_CELL,
  [LEGACY_TARGET_VERB.TALK]: LEGACY_COMMAND_TYPE.TALK_AT_CELL,
  [LEGACY_TARGET_VERB.LOOK]: LEGACY_COMMAND_TYPE.LOOK_AT_CELL,
  [LEGACY_TARGET_VERB.GET]: LEGACY_COMMAND_TYPE.GET_AT_CELL,
  [LEGACY_TARGET_VERB.DROP]: LEGACY_COMMAND_TYPE.DROP_AT_CELL,
  [LEGACY_TARGET_VERB.MOVE]: LEGACY_COMMAND_TYPE.MOVE_AT_CELL,
  [LEGACY_TARGET_VERB.USE]: LEGACY_COMMAND_TYPE.USE_VERB_AT_CELL
});
const LEGACY_LEDGER_MAX_CHARS = 17; /* clip 22..38 */
const LEGACY_LEDGER_MAX_LINES = 10; /* clip 14..23 */
const LEGACY_COMBAT_MODE_LABELS = Object.freeze([
  "COMMAND",
  "FRONT",
  "REAR",
  "FLANK",
  "BERSERK",
  "RETREAT",
  "ASSAULT"
]);
const LEGACY_GENERIC_PORTRAIT_BY_TYPE = Object.freeze({
  /* C_2FC1_1C19 generic portrait remaps for high objNums. */
  0x175: 0xc0, /* wisp */
  0x17e: 0xc1, /* guard */
  0x16b: 0xc2  /* gargoyle */
});
type StartupMenuHitbox = {
  x0: number;
  x1: number;
  rows: Array<[number, number]>;
};

const STARTUP_MENU_HITBOX: StartupMenuHitbox = Object.freeze({
  x0: 56,
  x1: 264,
  rows: [
    [86, 108] as [number, number],
    [107, 128] as [number, number],
    [127, 149] as [number, number],
    [148, 170] as [number, number],
    [169, 196] as [number, number]
  ]
});
const LEGACY_DIGIT_3X5 = Object.freeze([
  0xF6DE, 0x4924, 0xE7CE, 0xE59E, 0xB792,
  0xF39E, 0xF3DE, 0xE4A4, 0xF7DE, 0xF79E
]);
const LEGACY_DIGIT_X = Object.freeze([
  [7, 0, 0, 0],
  [9, 4, 0, 0],
  [11, 7, 3, 0],
  [13, 9, 5, 1]
]);
const THEMES = [
  "obsidian",
  "phosphor",
  "amber",
  "cga-cyan",
  "cga-magenta",
  "parchment",
  "cobalt",
  "bloodstone",
  "moonstone",
  "ash"
];
const FONTS = ["sans", "silkscreen", "kaijuz", "orangekid", "blockblueprint"];
const CAPTURE_PRESETS = [
  { id: "avatar_start", label: "Avatar Start (307,352,0)", x: 307, y: 352, z: 0 },
  { id: "lb_throne", label: "Lord British Throne (307,347,0)", x: 307, y: 347, z: 0 },
  { id: "wood_corner_a", label: "Wood Corner A (355,411,0)", x: 355, y: 411, z: 0 },
  { id: "wood_corner_b", label: "Wood Corner B (356,411,0)", x: 356, y: 411, z: 0 },
  { id: "britain_core", label: "Britain Core (337,365,0)", x: 337, y: 365, z: 0 },
  { id: "farmland", label: "Farmland Props (292,431,0)", x: 292, y: 431, z: 0 },
  { id: "anim_fire", label: "Animation Test Fire (360,397,0)", x: 360, y: 397, z: 0 },
  { id: "anim_wheels", label: "Animation Test Wheels (307,384,0)", x: 307, y: 384, z: 0 }
];
const INITIAL_WORLD = Object.freeze({
  is_on_quest: 0,
  next_sleep: 0,
  time_m: 0,
  time_h: 0,
  date_d: 1,
  date_m: 1,
  date_y: 1,
  wind_dir: 0,
  active: 0,
  map_x: 0x133,
  map_y: 0x160,
  map_z: 0,
  in_combat: 0,
  sound_enabled: 1
});

const INITIAL_SEED = 0x12345678;

const state = {
  sim: createInitialAppSimState(INITIAL_WORLD, INITIAL_SEED),
  audio: createU6AudioRuntime(),
  musicPhase: "",
  musicSong: "",
  audioAmbientLastTickBySfx: {},
  audioAmbientLastSfx: "",
  audioAmbientTriggerCount: 0,
  queue: [],
  commandLog: [],
  partyMembers: [1],
  partyNameById: { "1": "Avatar" },
  mapCtx: null,
  tileSet: null,
  objectLayer: null,
  entityLayer: null,
  animData: null,
  animationFrozen: false,
  frozenAnimationTick: null,
  objectOverlayCount: 0,
  entityOverlayCount: 0,
  renderParityMismatches: 0,
  interactionProbeTile: null,
  npcOcclusionBlockedMoves: 0,
  showGrid: false,
  uiProbeMode: "live",
  legacyHudSelection: null,
  legacyHudLayerHidden: false,
  debugPanelTab: "runtime",
  debugChatLedger: [],
  legacyLedgerLines: [],
  legacyLedgerPrompt: false,
  legacyPromptAnimMs: 0,
  legacyPromptAnimPhase: 0,
  legacyStatusDisplay: LEGACY_STATUS_DISPLAY.CMD_92 as number,
  showOverlayDebug: false,
  enablePaletteFx: true,
  movementMode: "ghost",
  useCursorActive: false,
  targetVerb: "",
  legacyConversationActive: false,
  legacyConversationInput: "",
  legacyConversationTargetName: "",
  legacyConversationActorEntityId: 0,
  legacyConversationPortraitTile: null,
  legacyConversationTargetObjNum: 0,
  legacyConversationTargetObjType: 0,
  legacyConversationShowInventory: false,
  legacyConversationEquipmentSlots: [],
  legacyConversationPaging: false,
  legacyConversationPages: [],
  legacyConversationKnownNames: {},
  legacyConversationAuthoritative: false,
  legacyConversationSessionId: "",
  legacyConversationVmContext: null,
  legacyConversationNpcKey: "",
  legacyConversationPendingPrompt: "",
  legacyConversationPrevStatus: LEGACY_STATUS_DISPLAY.CMD_92 as number,
  useCursorX: 0,
  useCursorY: 0,
  avatarFacingDx: 0,
  avatarFacingDy: 1,
  avatarLastMoveTick: -1,
  avatarWalkAnimUntilMs: -1,
  lastMoveQueueAtMs: -1,
  lastMoveInputDx: 0,
  lastMoveInputDy: 1,
  avatarFrameSeed: 0,
  palette: null,
  basePalette: null,
  tileFlags: null,
  tileFlags2: null,
  terrainType: null,
  paletteFrameTick: -1,
  paletteFrame: null,
  centerRawTile: 0,
  centerAnimatedTile: 0,
  centerPaletteBand: "none",
  cornerVariantCache: new Map(),
  lastTs: performance.now(),
  accMs: 0,
  loopHealth: {
    lastDtMs: 0,
    maxDtMs: 0,
    backlogDrops: 0,
    visibilityResets: 0,
    frameErrors: 0
  },
  simPaused: false,
  replayUrl: null,
  legacyPaperPixmap: null,
  lookStringEntries: null,
  converseArchiveA: null,
  converseArchiveB: null,
  converseArchiveDiag: "",
  legacyConversationScript: null,
  legacyConversationDescText: "",
  legacyConversationRules: [],
  legacyConversationPc: -1,
  legacyConversationInputOpcode: 0,
  legacyCombatModeLabel: "ASSAULT",
  legacyScaleMode: "4",
  legacyComposeCanvas: null,
  legacyBackdropBaseCanvas: null,
  avatarPortraitCanvas: null,
  portraitArchiveA: null,
  portraitArchiveB: null,
  portraitCanvasCache: new Map(),
  u6MainFont: null,
  runtimeReady: false,
  pristineBaselineVersion: "",
  pristineBaselinePollInFlight: false,
  pristineBaselineLastPollTick: -1,
  sessionStarted: false,
  startupMenuIndex: 0,
  startupTitlePixmaps: null,
  startupMenuPixmap: null,
  startupCanvasCache: new Map(),
  bootIntro: createBootIntroRuntimeState(),
  bootIntroBanks: null,
  bootIntroBlocks: null,
  bootIntroPalettes: null,
  bootIntroFont: null,
  bootIntroCanvasCache: new Map(),
  runtimeProfile: RUNTIME_PROFILE_CANONICAL_STRICT,
  runtimeExtensions: createDefaultRuntimeExtensions(),
  cursorPixmaps: null,
  cursorIndex: 0,
  mouseNormX: 0,
  mouseNormY: 0,
  mouseInCanvas: false,
  net: {
    apiBase: "http://127.0.0.1:8081",
    token: "",
    userId: "",
    username: "",
    email: "",
    emailVerified: false,
    sessionId: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`,
    characterId: "",
    characterName: "",
    remotePlayers: [],
    lastPresenceHeartbeatTick: -1,
    lastPresencePollTick: -1,
    lastClockPollTick: -1,
    presencePollInFlight: false,
    clockPollInFlight: false,
    backgroundSyncPaused: false,
    backgroundFailCount: 0,
    firstBackgroundFailAtMs: 0,
    lastSavedTick: 0,
    maintenanceAuto: false,
    maintenanceInFlight: false,
    lastMaintenanceTick: -1,
    recoveryEventCount: 0,
    resumeFromSnapshot: false,
    introPhase: "post_intro",
    statusLevel: "idle",
    statusText: "Not logged in."
  }
};

function wrapLegacyLedgerLines(text) {
  return wrapLegacyLedgerLinesImported(text, LEGACY_LEDGER_MAX_CHARS);
}

function pushLedgerMessage(text) {
  pushLedgerMessageImported(state, text, {
    maxChars: LEGACY_LEDGER_MAX_CHARS,
    maxLines: LEGACY_LEDGER_MAX_LINES,
    tick: Number(state.sim?.tick) >>> 0,
    nowMs: Date.now()
  });
}

function buildDebugChatLedgerText() {
  return buildDebugChatLedgerTextImported(state.debugChatLedger);
}

function renderDebugChatLedgerPanel() {
  if (debugChatCount) {
    const count = Array.isArray(state.debugChatLedger) ? state.debugChatLedger.length : 0;
    debugChatCount.textContent = `${count} entr${count === 1 ? "y" : "ies"}`;
  }
  if (debugChatLedgerBody) {
    debugChatLedgerBody.textContent = buildDebugChatLedgerText();
    debugChatLedgerBody.scrollTop = debugChatLedgerBody.scrollHeight;
  }
}

function setDebugPanelTab(tab) {
  const next = (tab === "chat") ? "chat" : "runtime";
  state.debugPanelTab = next;
  const runtimeActive = next === "runtime";
  if (debugPanelRuntime) {
    debugPanelRuntime.classList.toggle("hidden", !runtimeActive);
  }
  if (debugPanelChat) {
    debugPanelChat.classList.toggle("hidden", runtimeActive);
  }
  if (debugTabRuntime) {
    debugTabRuntime.classList.toggle("is-active", runtimeActive);
    debugTabRuntime.setAttribute("aria-selected", runtimeActive ? "true" : "false");
  }
  if (debugTabChat) {
    debugTabChat.classList.toggle("is-active", !runtimeActive);
    debugTabChat.setAttribute("aria-selected", runtimeActive ? "false" : "true");
  }
  if (!runtimeActive) {
    renderDebugChatLedgerPanel();
  }
}

function paginateLedgerMessages(lines, maxLines = LEGACY_LEDGER_MAX_LINES - 1) {
  return paginateLedgerMessagesImported(lines, maxLines, LEGACY_LEDGER_MAX_CHARS);
}

function startLegacyConversationPagination(lines) {
  return startLegacyConversationPaginationImported(state, lines, {
    pageMaxLines: LEGACY_LEDGER_MAX_LINES - 1,
    maxChars: LEGACY_LEDGER_MAX_CHARS,
    tick: Number(state.sim?.tick) >>> 0,
    nowMs: Date.now()
  });
}

function advanceLegacyConversationPagination() {
  return advanceLegacyConversationPaginationImported(state, pushLegacyConversationPrompt);
}

function showLegacyLedgerPrompt() {
  showLegacyLedgerPromptImported(state);
}

function isLegacyScaleMode(mode) {
  return mode === "fit" || mode === "1" || mode === "2" || mode === "3" || mode === "4";
}

function isLegacyFramePreviewOn() {
  return document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
}

const LEGACY_SCALE_MODES = Object.freeze(["fit", "1", "2", "3", "4"]);
const CURSOR_ASPECT_X = 1.0;
const CURSOR_ASPECT_Y = 1.2;

function animationTick() {
  if (state.animationFrozen) {
    if (state.frozenAnimationTick === null) {
      state.frozenAnimationTick = state.sim.tick >>> 0;
    }
    return state.frozenAnimationTick;
  }
  return state.sim.tick >>> 0;
}

function resolveAnimatedTileAtTick(tileId, counter) {
  if (!state.animData || !state.animData.hasBaseTile(tileId)) {
    return tileId;
  }
  return state.animData.animatedTile(tileId, counter);
}

function resolveAnimatedTile(tileId) {
  return resolveAnimatedTileAtTick(tileId, animationTick());
}

function resolveAnimatedObjectTileAtTick(obj, counter) {
  if (!obj) {
    return 0;
  }
  const doorTileId = resolveDoorTileIdRuntime(state.sim, obj);
  if (state.animData && state.animData.hasBaseTile(obj.baseTile)) {
    const animBase = state.animData.animatedTile(obj.baseTile, counter);
    return (animBase + (obj.frame | 0)) & 0xffff;
  }
  return resolveAnimatedTileAtTick(doorTileId, counter);
}

function resolveAnimatedObjectTile(obj) {
  return resolveAnimatedObjectTileAtTick(obj, animationTick());
}

function renderPaletteTick() {
  return animationTick();
}

function legacyPalettePhase() {
  /* Legacy VGA cycling repeats every 8 steps for the animated bands. */
  return renderPaletteTick() & 0x07;
}

function getRenderPalette() {
  if (!state.basePalette) {
    return null;
  }
  if (!state.enablePaletteFx) {
    return state.basePalette;
  }
  const phase = legacyPalettePhase();
  if (state.paletteFrame && state.paletteFrameTick === phase) {
    return state.paletteFrame;
  }
  state.paletteFrame = buildLegacyPaletteFrameRuntime(state.basePalette, phase);
  state.paletteFrameTick = phase;
  return state.paletteFrame;
}

function getRenderPaletteKey() {
  if (!state.enablePaletteFx) {
    return "pal-static";
  }
  return `palfx-${legacyPalettePhase()}`;
}

type U6ObjectEntry = {
  [key: string]: unknown;
  assocChild0010Count?: number;
  assocChildCount?: number;
  assocIndex: number;
  assocObj?: U6ObjectEntry;
  baseTile: number;
  coordUse: number;
  frame: number;
  index: number;
  legacyOrder?: number;
  order: number;
  renderable: boolean;
  sourceArea: number;
  sourceIndex: number;
  status: number;
  tileId: number;
  type: number;
  x: number;
  y: number;
  z: number;
};

type U6ObjectLayerParseResult = {
  entries: U6ObjectEntry[];
  assocEntries: U6ObjectEntry[];
};

class U6ObjectLayerJS {
  baseTiles: ArrayLike<number>;
  byCoord: Map<string, U6ObjectEntry[]>;
  entries: U6ObjectEntry[];
  assocEntries: U6ObjectEntry[];
  totalLoaded: number;
  filesLoaded: number;

  constructor(baseTiles: ArrayLike<number>) {
    this.baseTiles = baseTiles;
    this.byCoord = new Map();
    this.entries = [];
    this.assocEntries = [];
    this.totalLoaded = 0;
    this.filesLoaded = 0;
  }

  decodeCoord(raw0, raw1, raw2) {
    const x = raw0 | ((raw1 & 0x03) << 8);
    const y = (raw1 >> 2) | ((raw2 & 0x0f) << 6);
    const z = (raw2 >> 4) & 0x0f;
    return { x, y, z };
  }

  coordKey(x, y, z) {
    return `${x & 0x3ff},${y & 0x3ff},${z & 0x0f}`;
  }

  compareLegacyRenderOrder(a, b) {
    const ao = Number(a?.legacyOrder);
    const bo = Number(b?.legacyOrder);
    if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) {
      return ao - bo;
    }
    return compareLegacyObjectOrderStable(a, b);
  }

  parseObjBlk(bytes, areaId = 0): U6ObjectLayerParseResult {
    if (!bytes || bytes.length < 2) {
      return { entries: [], assocEntries: [] };
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let count = dv.getUint16(0, true);
    const maxCount = Math.min(0x0c00, Math.floor((bytes.length - 2) / 8));
    if (count > maxCount) {
      count = maxCount;
    }

    const decoded: U6ObjectEntry[] = [];
    for (let i = 0; i < count; i += 1) {
      const off = 2 + (i * 8);
      const status = bytes[off + 0];
      const { x, y, z } = this.decodeCoord(bytes[off + 1], bytes[off + 2], bytes[off + 3]);
      const shapeType = dv.getUint16(off + 4, true);
      const type = shapeType & 0x3ff;
      const frame = shapeType >>> 10;
      const base = this.baseTiles[type] ?? 0;
      const tileId = (base + frame) & 0xffff;
      const coordUse = status & OBJ_COORD_USE_MASK;
      const assocIndex = (bytes[off + 1] | (bytes[off + 2] << 8)) & 0xffff;
      decoded.push({
        index: i,
        assocIndex,
        x,
        y,
        z,
        status,
        coordUse,
        type,
        baseTile: base,
        frame,
        tileId,
        order: i,
        sourceArea: areaId & 0x3f,
        sourceIndex: i,
        renderable: isRenderableWorldObjectType(type)
      });
    }
    for (const row of decoded) {
      const ai = row.assocIndex | 0;
      if (ai >= 0 && ai < decoded.length) {
        row.assocObj = decoded[ai];
      }
    }
    const childCounts = new Uint16Array(count);
    const child0010Counts = new Uint16Array(count);
    for (const row of decoded) {
      if ((row.coordUse | 0) === OBJ_COORD_USE_LOCXYZ) {
        continue;
      }
      const ai = row.assocIndex | 0;
      if (ai < 0 || ai >= count) {
        continue;
      }
      childCounts[ai] = (childCounts[ai] + 1) & 0xffff;
      if ((row.status & 0x10) !== 0) {
        child0010Counts[ai] = (child0010Counts[ai] + 1) & 0xffff;
      }
    }
    const ordered = decoded.slice().sort((a, b) => {
      const cmp = compareLegacyObjectOrderStable(a, b);
      if (cmp !== 0) {
        return cmp;
      }
      return (a.index | 0) - (b.index | 0);
    });
    const legacyOrderByIndex = new Int32Array(count);
    legacyOrderByIndex.fill(-1);
    for (let i = 0; i < ordered.length; i += 1) {
      const idx = ordered[i].index | 0;
      if (idx >= 0 && idx < count) {
        legacyOrderByIndex[idx] = i;
      }
    }
    const entries: U6ObjectEntry[] = [];
    const assocEntries: U6ObjectEntry[] = [];
    for (const row of decoded) {
      const normalized = {
        ...row,
        legacyOrder: legacyOrderByIndex[row.index] | 0,
        assocChildCount: Number(childCounts[row.index] || 0),
        assocChild0010Count: Number(child0010Counts[row.index] || 0)
      };
      if ((row.coordUse | 0) !== OBJ_COORD_USE_LOCXYZ) {
        assocEntries.push(normalized);
        continue;
      }
      if (row.status & OBJ_STATUS_INVISIBLE) {
        continue;
      }
      entries.push(normalized);
    }
    return { entries, assocEntries };
  }

  addEntries(parsed: U6ObjectLayerParseResult) {
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    const assocEntries = Array.isArray(parsed?.assocEntries) ? parsed.assocEntries : [];
    for (const e of entries) {
      const key = this.coordKey(e.x, e.y, e.z);
      if (!this.byCoord.has(key)) {
        this.byCoord.set(key, []);
      }
      this.byCoord.get(key).push(e);
      this.entries.push(e);
      this.totalLoaded += 1;
    }
    for (const e of assocEntries) {
      this.assocEntries.push(e);
    }
  }

  objectAnchorKey(obj) {
    return `${obj.x & 0x3ff},${obj.y & 0x3ff},${obj.z & 0x0f},${obj.order & 0xffff},${obj.type & 0x3ff}`;
  }

  isObjectRemovedByKey(obj) {
    const removedCount = Number(state?.sim?.removedObjectCount) >>> 0;
    if (!removedCount) {
      return false;
    }
    const removed = state?.sim?.removedObjectKeys;
    if (!removed || typeof removed !== "object") {
      return false;
    }
    return !!removed[this.objectAnchorKey(obj)];
  }

  hasMirrorReflector(obj) {
    const key = this.coordKey(obj.x | 0, ((obj.y | 0) + 1) & 0x3ff, obj.z | 0);
    const below = this.byCoord.get(key) ?? [];
    for (const candidate of below) {
      if (!candidate || !candidate.renderable) {
        continue;
      }
      if ((candidate.order | 0) === (obj.order | 0) && (candidate.type | 0) === (obj.type | 0)) {
        continue;
      }
      if (this.isObjectRemovedByKey(candidate)) {
        continue;
      }
      return true;
    }
    return false;
  }

  applyLegacyRuntimeFixes(obj) {
    if (!obj) {
      return obj;
    }
    if ((obj.type & 0x03ff) !== 0x07b || (obj.frame | 0) >= 2) {
      return obj;
    }
    const nextFrame = this.hasMirrorReflector(obj) ? 1 : 0;
    if ((obj.frame | 0) === nextFrame) {
      return obj;
    }
    return {
      ...obj,
      frame: nextFrame,
      tileId: ((obj.baseTile | 0) + nextFrame) & 0xffff
    };
  }

  async loadOutdoor(fetcher) {
    this.byCoord.clear();
    this.entries = [];
    this.assocEntries = [];
    this.totalLoaded = 0;
    this.filesLoaded = 0;

    for (let ay = 0; ay < 8; ay += 1) {
      for (let ax = 0; ax < 8; ax += 1) {
        const name = `objblk${String.fromCharCode(97 + ax)}${String.fromCharCode(97 + ay)}`;
        const res = await fetcher(name);
        if (!res || !res.ok) {
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        const areaId = ((ay & 0x7) << 3) | (ax & 0x7);
        this.addEntries(this.parseObjBlk(buf, areaId));
        this.filesLoaded += 1;
      }
    }
    this.entries.sort((a, b) => this.compareLegacyRenderOrder(a, b));
    for (const list of this.byCoord.values()) {
      list.sort((a, b) => this.compareLegacyRenderOrder(a, b));
    }
  }

  objectsAt(x, y, z) {
    const list = this.byCoord.get(this.coordKey(x, y, z)) ?? [];
    const removedCount = Number(state?.sim?.removedObjectCount) >>> 0;
    if (!removedCount) {
      return list.map((o) => this.applyLegacyRuntimeFixes(o));
    }
    const removed = state?.sim?.removedObjectKeys;
    if (!removed || typeof removed !== "object") {
      return list.map((o) => this.applyLegacyRuntimeFixes(o));
    }
    return list.filter((o) => {
      const key = `${o.x & 0x3ff},${o.y & 0x3ff},${o.z & 0x0f},${o.order & 0xffff},${o.type & 0x3ff}`;
      return !removed[key];
    }).map((o) => this.applyLegacyRuntimeFixes(o));
  }

  objectsInWindowLegacyOrder(startX, startY, viewW, viewH, z) {
    const endX = (startX + viewW) | 0;
    const endY = (startY + viewH) | 0;
    const targetZ = z | 0;
    const removedCount = Number(state?.sim?.removedObjectCount) >>> 0;
    const removed = (removedCount && state?.sim?.removedObjectKeys && typeof state.sim.removedObjectKeys === "object")
      ? state.sim.removedObjectKeys
      : null;
    const out: U6ObjectEntry[] = [];
    for (const o of this.entries) {
      if ((o.z | 0) !== targetZ) {
        continue;
      }
      const ox = o.x | 0;
      const oy = o.y | 0;
      if (ox < startX || ox >= endX || oy < startY || oy >= endY) {
        continue;
      }
      if (removed) {
        const key = `${o.x & 0x3ff},${o.y & 0x3ff},${o.z & 0x0f},${o.order & 0xffff},${o.type & 0x3ff}`;
        if (removed[key]) {
          continue;
        }
      }
      out.push(this.applyLegacyRuntimeFixes(o));
    }
    return out;
  }
}

type U6EntityEntry = {
  [key: string]: unknown;
  assocIndex?: number;
  authoritative?: boolean;
  baseTile: number;
  coordUse?: number;
  direction: number;
  frame: number;
  homeX?: number;
  homeY?: number;
  id: number;
  movable?: boolean;
  npcComMode: number;
  npcFlag: number;
  npcMode: number;
  npcStatus: number;
  order: number;
  origFrame: number;
  origType: number;
  patrolPhase?: number;
  patrolRadius?: number;
  qual?: number;
  status: number;
  tileId: number;
  type: number;
  walkingFlag: boolean;
  x: number;
  y: number;
  z: number;
};

type U6EntityAssocEntry = {
  [key: string]: unknown;
  assocIndex: number;
  baseTile: number;
  coordUse: number;
  direction: number;
  frame: number;
  id: number;
  npcComMode: number;
  npcFlag: number;
  npcMode: number;
  npcStatus: number;
  order: number;
  origFrame: number;
  origType: number;
  status: number;
  tileId: number;
  type: number;
  walkingFlag: boolean;
};

type U6EntityLayerParseResult = {
  entries: U6EntityEntry[];
  assocEntries: U6EntityAssocEntry[];
};

class U6EntityLayerJS {
  baseTiles: ArrayLike<number>;
  entries: U6EntityEntry[];
  assocEntries: U6EntityAssocEntry[];
  totalLoaded: number;

  constructor(baseTiles: ArrayLike<number>) {
    this.baseTiles = baseTiles;
    this.entries = [];
    this.assocEntries = [];
    this.totalLoaded = 0;
  }

  isRenderableEntityType(type) {
    return type >= ENTITY_TYPE_ACTOR_MIN && type <= ENTITY_TYPE_ACTOR_MAX;
  }

  parseObjList(bytes): U6EntityLayerParseResult {
    if (!bytes || bytes.length < 0x0900) {
      return { entries: [], assocEntries: [] };
    }
    const objStatusOff = 0x0000;
    const objPosOff = 0x0100;
    const objShapeOff = 0x0400;
    const npcStatusOff = 0x0800;
    const npcModeOff = 0x11f1;
    const npcComModeOff = 0x12f1;
    const origShapeOff = 0x15f1;
    const npcFlagOff = 0x19f1;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out: U6EntityEntry[] = [];
    const assocEntries: U6EntityAssocEntry[] = [];
    for (let id = 0; id < 0x100; id += 1) {
      const status = bytes[objStatusOff + id];
      const npcStatus = bytes[npcStatusOff + id];
      const shapeType = dv.getUint16(objShapeOff + (id * 2), true);
      if (shapeType === 0) {
        continue;
      }
      const coordUse = status & OBJ_COORD_USE_MASK;
      const type = shapeType & 0x03ff;
      const frame = shapeType >>> 10;
      const origShapeType = origShapeOff + (id * 2) + 1 < bytes.length
        ? dv.getUint16(origShapeOff + (id * 2), true)
        : shapeType;
      const npcMode = npcModeOff + id < bytes.length ? bytes[npcModeOff + id] : 0;
      const npcComMode = npcComModeOff + id < bytes.length ? bytes[npcComModeOff + id] : 0;
      const npcFlag = npcFlagOff + id < bytes.length ? bytes[npcFlagOff + id] : 0;
      const qual = bytes[0x0700 + id] & 0xff;
      const pos = objPosOff + (id * 3);
      const baseTile = this.baseTiles[type] ?? 0;
      if (baseTile === 0) {
        continue;
      }
      if (coordUse !== OBJ_COORD_USE_LOCXYZ) {
        if (coordUse === OBJ_COORD_USE_EQUIP) {
          const assocIndex = (bytes[pos + 0] | (bytes[pos + 1] << 8)) & 0xffff;
          assocEntries.push({
            id,
            status,
            npcStatus,
            coordUse,
            assocIndex,
            type,
            frame,
            origType: origShapeType & 0x03ff,
            origFrame: origShapeType >>> 10,
            npcMode,
            npcComMode,
            npcFlag,
            direction: npcFlag & NPC_FLAG_DIRECTION_MASK,
            walkingFlag: (npcFlag & NPC_FLAG_WALKING) !== 0,
            baseTile,
            tileId: (baseTile + frame) & 0xffff,
            order: id
          });
        }
        continue;
      }
      if (!this.isRenderableEntityType(type)) {
        continue;
      }
      const x = bytes[pos + 0] | ((bytes[pos + 1] & 0x03) << 8);
      const y = (bytes[pos + 1] >> 2) | ((bytes[pos + 2] & 0x0f) << 6);
      const z = (bytes[pos + 2] >> 4) & 0x0f;
      out.push({
        id,
        x,
        y,
        z,
        status,
        npcStatus,
        qual,
        type,
        frame,
        origType: origShapeType & 0x03ff,
        origFrame: origShapeType >>> 10,
        npcMode,
        npcComMode,
        npcFlag,
        direction: npcFlag & NPC_FLAG_DIRECTION_MASK,
        walkingFlag: (npcFlag & NPC_FLAG_WALKING) !== 0,
        baseTile,
        tileId: (baseTile + frame) & 0xffff,
        order: id
      });
    }
    out.sort((a, b) => a.order - b.order);
    assocEntries.sort((a, b) => a.order - b.order);
    return { entries: out, assocEntries };
  }

  load(bytes) {
    const parsed = this.parseObjList(bytes);
    this.entries = parsed.entries;
    this.assocEntries = parsed.assocEntries;
    for (const e of this.entries) {
      e.homeX = e.x;
      e.homeY = e.y;
      e.authoritative = false;
      e.patrolPhase = e.id & 0x03;
      e.patrolRadius = 2;
      e.movable = false;
    }
    this.totalLoaded = this.entries.length;
  }

  entitiesInView(startX, startY, z, w, h) {
    const endX = startX + w;
    const endY = startY + h;
    const out: U6EntityEntry[] = [];
    for (const e of this.entries) {
      if (e.z !== z) {
        continue;
      }
      if (e.x < startX || e.x >= endX || e.y < startY || e.y >= endY) {
        continue;
      }
      out.push(e);
    }
    out.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.order - b.order;
    });
    return out;
  }

  tileBlocks(x, y, z, mapCtx, tileFlags, terrainType, objectLayer) {
    if (!mapCtx) {
      return false;
    }
    const t = mapCtx.tileAt(x, y, z);
    if (tileFlags && ((tileFlags[t & 0x7ff] ?? 0) & 0x04)) {
      return true;
    }
    if (terrainType && ((terrainType[t & 0x7ff] ?? 0) & 0x04)) {
      return true;
    }
    if (objectLayer && tileFlags) {
      const overlays = objectLayer.objectsAt(x, y, z);
      for (const o of overlays) {
        const tf = tileFlags[o.tileId & 0x7ff] ?? 0;
        if (tf & 0x04) {
          return true;
        }
      }
    }
    return false;
  }

  step(_tick, _mapCtx, _tileFlags, _terrainType, _objectLayer, _visibleAtWorld) {
    // Real legacy movement comes from schedule/AI state; do not apply placeholder patrol drift.
    return 0;
  }
}

function decompressU6Lzw(bytes) {
  if (!bytes || bytes.length < 4) {
    return bytes;
  }
  const target = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
  if (target <= 0) {
    return bytes;
  }
  const src = bytes.slice(4);
  const out = new Uint8Array(target);
  let outPos = 0;
  let bitPos = 0;
  let codeSize = 9;
  let nextCode = 258;
  const CLEAR = 256;
  const END = 257;
  const table = new Array(4096);
  for (let i = 0; i < 256; i += 1) {
    table[i] = new Uint8Array([i]);
  }
  let prev = null;

  function readCode(n) {
    let outOff = 0;
    for (let i = 0; i < n; i += 1) {
      const bi = (bitPos + i) >> 3;
      const bt = (bitPos + i) & 7;
      if (bi >= src.length) {
        return -1;
      }
      outOff |= ((src[bi] >> bt) & 1) << i;
    }
    bitPos += n;
    return outOff;
  }

  while (outPos < out.length) {
    const code = readCode(codeSize);
    if (code < 0) {
      break;
    }
    if (code === CLEAR) {
      for (let i = 258; i < table.length; i += 1) {
        table[i] = undefined;
      }
      codeSize = 9;
      nextCode = 258;
      prev = null;
      continue;
    }
    if (code === END) {
      break;
    }

    let entry;
    if (table[code]) {
      entry = table[code];
    } else if (code === nextCode && prev) {
      entry = new Uint8Array(prev.length + 1);
      entry.set(prev, 0);
      entry[prev.length] = prev[0];
    } else {
      break;
    }

    out.set(entry.slice(0, Math.max(0, out.length - outPos)), outPos);
    outPos += entry.length;

    if (prev && nextCode < 4096) {
      const n = new Uint8Array(prev.length + 1);
      n.set(prev, 0);
      n[prev.length] = entry[0];
      table[nextCode] = n;
      nextCode += 1;
      if ((nextCode === 512 || nextCode === 1024 || nextCode === 2048) && codeSize < 12) {
        codeSize += 1;
      }
    }
    prev = entry;
  }

  return out;
}

function legacyLookupTileString(tileId) {
  return legacyLookupTileStringRuntime(tileId, state.lookStringEntries);
}

function legacyArticleForTile(tileId) {
  return legacyArticleForTileRuntime(tileId, state.tileFlags2);
}

function canonicalLookSentenceForTile(tileId) {
  return canonicalLookSentenceForTileRuntime(tileId, state.lookStringEntries, state.tileFlags2);
}

function canonicalTalkSpeakerForTile(tileId) {
  return canonicalTalkSpeakerForTileRuntime(tileId, state.lookStringEntries, state.tileFlags2);
}

function sanitizeLegacyHudLabelText(text) {
  return sanitizeLegacyHudLabelTextRuntime(text);
}

function areaIdForWorldXY(x, y) {
  return areaIdForWorldXYRuntime(x, y);
}

function legacyEquipmentSlotsForTalkActor(actor) {
  if (!actor) {
    return [];
  }
  const actorId = Number(actor.id) | 0;
  const actorX = Number(actor.x) | 0;
  const actorY = Number(actor.y) | 0;
  const actorZ = Number(actor.z) | 0;
  const actorType = Number(actor.type) & 0x03ff;
  const rootAssocOwner = (row) => {
    let cur = row;
    const seen = new Set();
    for (let i = 0; i < 64; i += 1) {
      if (!cur || typeof cur !== "object") {
        return null;
      }
      if ((cur.coordUse | 0) === OBJ_COORD_USE_LOCXYZ) {
        return cur;
      }
      const key = String(cur.index != null ? cur.index : cur.id);
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);
      cur = cur.assocObj || null;
    }
    return null;
  };
  const ownerMatchesActor = (owner) => !!owner
    && ((owner.coordUse | 0) === OBJ_COORD_USE_LOCXYZ)
    && ((owner.x | 0) === actorX)
    && ((owner.y | 0) === actorY)
    && ((owner.z | 0) === actorZ)
    && ((owner.type & 0x03ff) === actorType);
  const selectEquipRows = (rows, useObjblkOwnerFallback) => (Array.isArray(rows) ? rows : [])
    .filter((row) => {
      if (!row || (row.coordUse | 0) !== OBJ_COORD_USE_EQUIP) {
        return false;
      }
      const byIndex = ((row.assocIndex | 0) === actorId);
      let byAssocObj = false;
      if (useObjblkOwnerFallback) {
        const owner = rootAssocOwner(row);
        byAssocObj = ownerMatchesActor(owner);
      }
      if (!byIndex && !byAssocObj) {
        return false;
      }
      const type = row.type & 0x03ff;
      if (type === 0x150 || type === 0x151) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ao = Number((a.legacyOrder != null) ? a.legacyOrder : a.order) | 0;
      const bo = Number((b.legacyOrder != null) ? b.legacyOrder : b.order) | 0;
      if (ao !== bo) return ao - bo;
      return (a.index | 0) - (b.index | 0);
    });
  /*
    Canonical source first: objlist actor table stores actor-owned/equipped objects.
    Objblk assoc rows are a fallback for baseline/static snapshots.
  */
  let equipRows = selectEquipRows(state.entityLayer?.assocEntries, false);
  if (!equipRows.length) {
    equipRows = selectEquipRows(state.objectLayer?.assocEntries, true);
  }
  if (!equipRows.length) {
    return [];
  }
  return projectLegacyEquipmentSlotsRuntime(equipRows.map((row) => ({
    tileId: Number(row.tileId) & 0xffff,
    object_key: `objblk:${Number(row.sourceArea) | 0}:${Number(row.index) | 0}`
  })));
}

function endLegacyConversation() {
  endLegacyConversationImported(state);
}

function pushLegacyConversationPrompt() {
  const rawName = String(state.net?.characterName || "Avatar").trim();
  const name = (rawName || "Avatar").slice(0, 12);
  pushLedgerMessage(`${name}:`);
  showLegacyLedgerPrompt();
}

const CONV_OP_KEY = 0xef;
const CONV_OP_RES = 0xf6;
const CONV_OP_ENDRES = 0xee;
const CONV_OP_END = 0xff;
const CONV_OP_JOIN = 0xca;
const CONV_OP_ASKTOP = 0xf7;
const CONV_OP_GET = 0xf8;
const CONV_OP_GETSTR = 0xf9;
const CONV_OP_GETCHR = 0xfa;
const CONV_OP_GETINT = 0xfb;
const CONV_OP_GETDIGIT = 0xfc;
const CONV_OP_GOTO = 0xb0;
const CONV_OP_CALL = 0xb1;
const CONV_OP_VARINT = 0xb2;
const CONV_OP_VARSTR = 0xb3;
const CONV_OP_PRINTSTR = 0xb5;
const CONV_OP_IF = 0xa1;
const CONV_OP_ENDIF = 0xa2;
const CONV_OP_ELSE = 0xa3;
const CONV_OP_LET = 0xa6;
const CONV_OP_END_OF_FACTOR = 0xa7;
const CONV_OP_LET_VALUE = 0xa8;
const CONV_OP_TST = 0xab;
const CONV_OP_ADDRESS = 0xd2;
const CONV_OP_BYTE = 0xd3;
const CONV_OP_WORD = 0xd4;
const CONV_OP_EQU = 0x86;
const CONV_OP_DIF = 0x85;
const CONV_OP_SUP = 0x81;
const CONV_OP_SUPE = 0x82;
const CONV_OP_INF = 0x83;
const CONV_OP_INFE = 0x84;
const CONV_OP_ADD = 0x90;
const CONV_OP_SUB = 0x91;
const CONV_OP_MUL = 0x92;
const CONV_OP_DIV = 0x93;
const CONV_OP_OR = 0x94;
const CONV_OP_AND = 0x95;
const CONV_OP_NPC = 0xeb;

function conversationMacroSymbolToIndex(sym) {
  return conversationMacroSymbolToIndexImported(sym);
}

function conversationVmContextForSession(overrides = null) {
  const ov = (overrides && typeof overrides === "object") ? overrides : {};
  return buildConversationVmContextImported({
    hour: Number(state.sim.world?.time_h) | 0,
    player: String(state.net?.characterName || "Avatar").trim() || "Avatar",
    target: String(ov.targetName || state.legacyConversationTargetName || "").trim(),
    greeting: String(ov.greeting || "milady").trim() || "milady",
    partySize: Number(state.sim?.partySize) | 0,
    objNum: Number(ov.objNum) | 0
  });
}

function decodeU6LzwWithKnownLength(srcBytes, outLen) {
  return decodeU6LzwWithKnownLengthRuntime(srcBytes, outLen);
}

function loadLegacyConversationScript(objNum, objType) {
  return loadLegacyConversationScriptForNpcRuntime(
    { a: state.converseArchiveA, b: state.converseArchiveB },
    objNum,
    objType
  );
}

function parseConversationHeaderAndDesc(scriptBytes) {
  return parseConversationHeaderAndDescRuntime(scriptBytes);
}

function isLikelyValidConversationScript(scriptBytes, header) {
  return isLikelyValidConversationScriptRuntime(scriptBytes, header);
}

function canonicalConversationHintIdFromSpeaker(speaker) {
  return canonicalConversationHintIdFromSpeakerRuntime(speaker);
}

function normalizedNameForCompare(name) {
  return normalizedConversationNameRuntime(name);
}

function headerMatchesExpectedCanonicalName(header, objNum) {
  return conversationHeaderMatchesExpectedCanonicalNameRuntime(header, objNum);
}

function headerMatchesExpectedCanonicalDesc(header, objNum) {
  return conversationHeaderMatchesExpectedCanonicalDescRuntime(header, objNum);
}

function headerIsPlausibleCanonicalFallback(script, header, objNum) {
  return conversationHeaderIsPlausibleCanonicalFallbackRuntime(script, header, objNum);
}

function resolveConversationScriptForActor(actor, tileId) {
  const actorId = Number(actor?.id) | 0;
  const actorType = Number(actor?.type) & 0x03ff;
  const actorQual = Number(actor?.qual) & 0xff;
  const speakerHint = canonicalTalkSpeakerForTile(tileId);
  const hintId = canonicalConversationHintIdFromSpeaker(speakerHint);
  const candidates = [];
  const pushCandidate = (n) => {
    const v = Number(n) | 0;
    if (v < 0) return;
    if (!candidates.includes(v)) candidates.push(v);
  };
  if (hintId >= 0) {
    pushCandidate(hintId);
  }
  if (actorType === 0x189 || actorType === 0x18d || actorType === 0x18e || actorType === 0x18f) {
    pushCandidate(actorQual);
  }
  pushCandidate(actorId);
  for (const objNum of candidates) {
    const script = loadLegacyConversationScript(objNum, actorType);
    const header = parseConversationHeaderAndDesc(script);
    if (
      isLikelyValidConversationScript(script, header)
      && (
        (
          headerMatchesExpectedCanonicalName(header, objNum)
          && headerMatchesExpectedCanonicalDesc(header, objNum)
        )
        || headerIsPlausibleCanonicalFallback(script, header, objNum)
      )
    ) {
      return { objNum, script, header, valid: true };
    }
  }
  if (hintId >= 0) {
    const script = loadLegacyConversationScript(hintId, actorType);
    const header = parseConversationHeaderAndDesc(script);
    return {
      objNum: hintId,
      script,
      header,
      valid: (
        isLikelyValidConversationScript(script, header)
        && (
          (
            headerMatchesExpectedCanonicalName(header, hintId)
            && headerMatchesExpectedCanonicalDesc(header, hintId)
          )
          || headerIsPlausibleCanonicalFallback(script, header, hintId)
        )
      )
    };
  }
  const fallbackScript = loadLegacyConversationScript(actorId, actorType);
  const fallbackHeader = parseConversationHeaderAndDesc(fallbackScript);
  return {
    objNum: actorId,
    script: fallbackScript,
    header: fallbackHeader,
    valid: isLikelyValidConversationScript(fallbackScript, fallbackHeader)
  };
}

function debugConversationResolutionSummary(actor, tileId) {
  const actorId = Number(actor?.id) | 0;
  const actorType = Number(actor?.type) & 0x03ff;
  const actorQual = Number(actor?.qual) & 0xff;
  const speakerHint = canonicalTalkSpeakerForTile(tileId);
  const hintId = canonicalConversationHintIdFromSpeaker(speakerHint);
  const candidates = [];
  const pushCandidate = (n) => {
    const v = Number(n) | 0;
    if (v < 0) return;
    if (!candidates.includes(v)) candidates.push(v);
  };
  if (hintId >= 0) pushCandidate(hintId);
  if (actorType === 0x189 || actorType === 0x18d || actorType === 0x18e || actorType === 0x18f) {
    pushCandidate(actorQual);
  }
  pushCandidate(actorId);
  const parts = [];
  const convA = (state.converseArchiveA instanceof Uint8Array) ? 1 : 0;
  const convB = (state.converseArchiveB instanceof Uint8Array) ? 1 : 0;
  parts.push(`convA=${convA} convB=${convB} hint=${hintId} actor=${actorId} type=0x${actorType.toString(16)}`);
  for (const objNum of candidates) {
    const script = loadLegacyConversationScript(objNum, actorType);
    const header = parseConversationHeaderAndDesc(script);
    const validScript = isLikelyValidConversationScript(script, header) ? 1 : 0;
    const nameOk = headerMatchesExpectedCanonicalName(header, objNum) ? 1 : 0;
    const descOk = headerMatchesExpectedCanonicalDesc(header, objNum) ? 1 : 0;
    const fallbackOk = headerIsPlausibleCanonicalFallback(script, header, objNum) ? 1 : 0;
    const rules = parseConversationRules(script, Number(header?.mainPc) | 0).length;
    const headerName = sanitizeLegacyHudLabelText(String(header?.name || "").slice(0, 24));
    parts.push(`c${objNum}[v=${validScript} n=${nameOk} d=${descOk} f=${fallbackOk} r=${rules} h=${headerName || "-"}]`);
  }
  const loadDiag = String(state.converseArchiveDiag || "").trim();
  if (loadDiag) {
    parts.push(`load{${loadDiag}}`);
  }
  return parts.join(" | ");
}

function splitConversationInputWords(input) {
  return splitConversationInputWordsImported(input);
}

function conversationWordMatchesPattern(pattern, word) {
  return conversationWordMatchesPatternImported(pattern, word);
}

function conversationKeyMatchesInput(pattern, input) {
  return conversationKeyMatchesInputImported(pattern, input);
}

function parseConversationRules(scriptBytes, mainPc) {
  return parseConversationRulesImported(scriptBytes, mainPc, {
    KEY: CONV_OP_KEY,
    RES: CONV_OP_RES,
    ENDRES: CONV_OP_ENDRES
  });
}

function findConversationFirstKeyPc(scriptBytes, mainPc) {
  return findConversationFirstKeyPcImported(scriptBytes, mainPc, {
    KEY: CONV_OP_KEY,
    RES: CONV_OP_RES,
    ENDRES: CONV_OP_ENDRES
  });
}

function decodeConversationResponseOpcodeAware(scriptBytes, startPc, endPc, opts = null) {
  return decodeConversationResponseOpcodeAwareImported(scriptBytes, startPc, endPc, opts);
}

function decodeConversationResponseBytes(responseBytes, scriptBytes = null, startPc = -1, endPc = -1, vmContext = null) {
  return decodeConversationResponseBytesImported(responseBytes, scriptBytes, startPc, endPc, vmContext);
}

function decodeConversationOpeningLines(scriptBytes, mainPc, vmContext = null) {
  return decodeConversationOpeningLinesImported(scriptBytes, mainPc, vmContext);
}

function decodeConversationOpeningResult(scriptBytes, mainPc, vmContext = null) {
  return decodeConversationOpeningResultImported(scriptBytes, mainPc, vmContext);
}

function renderConversationMacros(text, vmContext = null) {
  const ctx = (vmContext && typeof vmContext === "object")
    ? vmContext
    : (state.legacyConversationVmContext || conversationVmContextForSession());
  return renderConversationMacrosWithContextImported(text, ctx);
}

function canonicalTalkFallbackGreeting(objNum, speaker, vmContext = null) {
  const ctx = (vmContext && typeof vmContext === "object")
    ? vmContext
    : (state.legacyConversationVmContext || conversationVmContextForSession());
  return canonicalTalkFallbackGreetingImported(
    objNum,
    ctx,
    conversationMacroSymbolToIndex
  );
}

function canonicalizeOpeningLines(objNum, lines) {
  return canonicalizeOpeningLinesImported(
    objNum,
    lines,
    canonicalTalkFallbackGreeting(objNum, "Lord British")
  );
}

function formatYouSeeLine(subject) {
  return formatYouSeeLineImported(subject);
}

function legacyConversationReply(targetName, typed) {
  if (state.legacyConversationScript instanceof Uint8Array) {
    const startPc = Number(state.legacyConversationPc) | 0;
    if (startPc >= 0) {
      const cursorReply = conversationRunFromKeyCursor(
        state.legacyConversationScript,
        startPc,
        typed,
        state.legacyConversationVmContext
      );
      if (cursorReply && cursorReply.kind === "ok") {
        state.legacyConversationPc = Number(cursorReply.nextPc) | 0;
        state.legacyConversationInputOpcode = Number(cursorReply.stopOpcode) | 0;
        return {
          kind: "ok",
          lines: Array.isArray(cursorReply.lines) ? cursorReply.lines : []
        };
      }
      if (cursorReply && cursorReply.kind === "no-match") {
        return { kind: "no-match", lines: [] };
      }
    }
  }
  return legacyConversationReplyImported({
    typed,
    rules: state.legacyConversationRules,
    script: state.legacyConversationScript,
    vmContext: state.legacyConversationVmContext,
    descText: state.legacyConversationDescText,
    keyMatchesInput: conversationKeyMatchesInput,
    decodeResponseBytes: decodeConversationResponseBytes,
    renderMacros: renderConversationMacros,
    formatYouSeeLine
  });
}

function conversationRunFromKeyCursor(scriptBytes, startPc, typed, vmContext) {
  return conversationRunFromKeyCursorImported({
    scriptBytes,
    startPc,
    typed,
    vmContext,
    opcodes: {
      ASKTOP: CONV_OP_ASKTOP,
      GET: CONV_OP_GET,
      KEY: CONV_OP_KEY,
      RES: CONV_OP_RES,
      ENDRES: CONV_OP_ENDRES,
      END: CONV_OP_END
    },
    keyMatchesInput: conversationKeyMatchesInput,
    decodeResponseOpcodeAware: decodeConversationResponseOpcodeAware,
    renderMacros: renderConversationMacros
  });
}

function submitLegacyConversationInput() {
  const out = submitLegacyConversationInputImported(state, {
    pushLedgerMessage,
    pushPrompt: pushLegacyConversationPrompt,
    showPrompt: showLegacyLedgerPrompt,
    endConversation: endLegacyConversation,
    formatYouSeeLine,
    reply: (typed) => legacyConversationReply(state.legacyConversationTargetName, typed),
    startPagination: startLegacyConversationPagination
  });
  if (out && out.diagText) {
    diagBox.className = "diag ok";
    diagBox.textContent = out.diagText;
  }
}

async function submitAuthoritativeConversationInput() {
  const typed = String(state.legacyConversationInput || "").trim();
  state.legacyConversationInput = "";
  state.legacyLedgerPrompt = false;
  if (!typed) {
    pushLegacyConversationPrompt();
    return;
  }
  pushLedgerMessage(typed);
  const out = await netReplyConversation(typed);
  const lines = Array.isArray(out?.lines)
    ? out.lines.map((line) => String(line || "").trim()).filter(Boolean)
    : [];
  if (String(out?.kind || "") === "ended" || !!out?.ended) {
    for (const line of lines) {
      pushLedgerMessage(line);
    }
    endLegacyConversation();
    diagBox.className = "diag ok";
    diagBox.textContent = "Conversation ended.";
    return;
  }
  if (typeof out?.next_pc === "number") {
    state.legacyConversationPc = Number(out.next_pc) | 0;
  }
  if (typeof out?.stop_opcode === "number") {
    state.legacyConversationInputOpcode = Number(out.stop_opcode) | 0;
  }
  if (startLegacyConversationPagination(lines)) {
    return;
  }
  if (lines.length > 0) {
    for (const line of lines) {
      pushLedgerMessage(line);
    }
  }
  pushLegacyConversationPrompt();
}

function handleLegacyConversationKeydown(ev) {
  if (state.legacyConversationAuthoritative && !state.legacyConversationPaging && String(ev?.key || "") === "Enter") {
    submitAuthoritativeConversationInput().catch((err) => {
      diagBox.className = "diag warn";
      diagBox.textContent = `Conversation reply failed: ${errorMessageRuntime(err)}`;
      pushLedgerMessage("No response.");
      pushLegacyConversationPrompt();
    });
    return true;
  }
  const out = handleLegacyConversationKeydownImported(state, ev, {
    endConversation: endLegacyConversation,
    advancePagination: advanceLegacyConversationPagination,
    submitInput: submitLegacyConversationInput,
    maxChars: LEGACY_LEDGER_MAX_CHARS
  });
  if (out && out.diagText) {
    diagBox.className = "diag ok";
    diagBox.textContent = out.diagText;
  }
  return !!out?.handled;
}

function decodeU6ShapeFromBuffer(buf) {
  return decodeU6ShapeFromBufferRuntime(buf);
}

function decodeU6ShpArchive(bytes) {
  return decodeU6ShpArchiveRuntime(bytes, decompressU6Lzw);
}

function decodeU6CursorPtr(bytes) {
  return decodeU6CursorPtrRuntime(bytes, decompressU6Lzw);
}

function decodePortraitFromArchive(bytes, index = 0) {
  return decodePortraitFromArchiveRuntime(bytes, decompressU6Lzw, index);
}

function resolveLegacyPortraitEntry(objNum, objType) {
  let n = Number(objNum) | 0;
  const t = Number(objType) & 0x03ff;
  if (n >= 0xe0) {
    const mapped = LEGACY_GENERIC_PORTRAIT_BY_TYPE[t];
    if (mapped == null) {
      return null;
    }
    n = mapped;
  }
  if (n === 1) {
    /*
      Avatar portrait uses save-slot selection (D_2CCB - 1) in C_2FC1_1C19.
      Runtime save header wiring is pending; keep existing avatar portrait path.
    */
    return null;
  }
  if (n > 0) {
    n -= 1;
  }
  if (n >= 0x62) {
    return { archive: "b", index: n - 0x62 };
  }
  return { archive: "a", index: n };
}

function conversationPortraitCanvas(probeConversationPanel = null) {
  if (!state.basePalette) {
    return null;
  }
  const panel = probeConversationPanel && typeof probeConversationPanel === "object"
    ? probeConversationPanel
    : {};
  const objNum = panel.target_obj_num != null
    ? (Number(panel.target_obj_num) | 0)
    : (Number(state.legacyConversationTargetObjNum) | 0);
  const objType = panel.target_obj_type != null
    ? (Number(panel.target_obj_type) | 0)
    : (Number(state.legacyConversationTargetObjType) | 0);
  const resolved = resolveLegacyPortraitEntry(objNum, objType);
  if (!resolved) {
    return state.avatarPortraitCanvas;
  }
  const archive = resolved.archive === "b" ? state.portraitArchiveB : state.portraitArchiveA;
  if (!archive) {
    return null;
  }
  const paletteKey = getRenderPaletteKey();
  const cacheKey = `${resolved.archive}:${resolved.index}:${paletteKey}`;
  if (state.portraitCanvasCache.has(cacheKey)) {
    return state.portraitCanvasCache.get(cacheKey);
  }
  const pix = decodePortraitFromArchive(archive, resolved.index);
  if (!pix) {
    return null;
  }
  const canvas = canvasFromIndexedPixels(pix, getRenderPalette() || state.basePalette);
  if (!canvas) {
    return null;
  }
  state.portraitCanvasCache.set(cacheKey, canvas);
  return canvas;
}

function canvasFromIndexedPixels(pixmap, palette, transparentIndex = null) {
  return canvasFromIndexedPixelsRuntime(pixmap, palette, document, transparentIndex);
}

function drawU6MainText(g, text, sx, sy, scale = 1, color = "#e7dcc0") {
  drawU6MainTextRuntime(g, state.u6MainFont, text, sx, sy, scale, color);
}

function u6GlyphSpan(code) {
  return u6GlyphSpanRuntime(state.u6MainFont, code);
}

function measureU6TextWidth(text, compact = false) {
  return measureU6TextWidthRuntime(state.u6MainFont, text, compact);
}

function drawU6CompactText(g, text, sx, sy, scale = 1, color = "#e7dcc0") {
  drawU6CompactTextRuntime(g, state.u6MainFont, text, sx, sy, scale, color);
}

function drawLegacyContinueArrow(g, sx, sy, scale = 1, color = "#e7dcc0") {
  drawLegacyContinueArrowRuntime(g, state.u6MainFont, sx, sy, scale, color);
}

function applyLegacyFrameLayout() {
  if (!legacyBackdropCanvas || !legacyWorldSurface || !canvas || !legacyViewportCanvas) {
    return;
  }

  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  if (!enabled) {
    legacyWorldSurface.style.width = "";
    legacyWorldSurface.style.height = "";
    canvas.style.left = "";
    canvas.style.top = "";
    canvas.style.width = "";
    canvas.style.height = "";
    legacyViewportCanvas.style.left = "";
    legacyViewportCanvas.style.top = "";
    legacyViewportCanvas.style.width = "";
    legacyViewportCanvas.style.height = "";
    return;
  }

  const pixmap = state.legacyPaperPixmap;
  const pal = state.basePalette;
  if (!pixmap || !pal || pal.length < 256) {
    return;
  }

  const srcW = pixmap.width | 0;
  const srcH = pixmap.height | 0;
  const host = legacyWorldSurface.parentElement || legacyWorldSurface;
  const hostRect = host.getBoundingClientRect();
  const fitScaleX = Math.floor((hostRect.width || srcW) / srcW);
  const fitScaleY = Math.floor((hostRect.height || srcH) / srcH);
  const fitScale = Math.max(1, Math.min(fitScaleX, fitScaleY));
  let scale = fitScale;
  if (state.legacyScaleMode !== "fit") {
    const fixed = Number.parseInt(state.legacyScaleMode, 10);
    if (Number.isFinite(fixed) && fixed >= 1) {
      scale = fixed;
    }
  }
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const src = document.createElement("canvas");
  src.width = srcW;
  src.height = srcH;
  const sg = src.getContext("2d");
  const id = sg.createImageData(srcW, srcH);
  for (let i = 0, p = 0; i < pixmap.pixels.length; i += 1, p += 4) {
    const c = pal[pixmap.pixels[i] & 0xff] ?? [0, 0, 0];
    id.data[p + 0] = c[0] | 0;
    id.data[p + 1] = c[1] | 0;
    id.data[p + 2] = c[2] | 0;
    id.data[p + 3] = 255;
  }
  sg.putImageData(id, 0, 0);

  legacyBackdropCanvas.width = outW;
  legacyBackdropCanvas.height = outH;
  const bg = legacyBackdropCanvas.getContext("2d");
  bg.imageSmoothingEnabled = false;
  bg.clearRect(0, 0, outW, outH);
  bg.drawImage(src, 0, 0, srcW, srcH, 0, 0, outW, outH);
  if (!state.legacyBackdropBaseCanvas) {
    state.legacyBackdropBaseCanvas = document.createElement("canvas");
  }
  state.legacyBackdropBaseCanvas.width = outW;
  state.legacyBackdropBaseCanvas.height = outH;
  const bb = state.legacyBackdropBaseCanvas.getContext("2d");
  bb.imageSmoothingEnabled = false;
  bb.clearRect(0, 0, outW, outH);
  bb.drawImage(legacyBackdropCanvas, 0, 0);

  const mapX = LEGACY_UI_MAP_RECT.x * scale;
  const mapY = LEGACY_UI_MAP_RECT.y * scale;
  const mapW = LEGACY_UI_MAP_RECT.w * scale;
  const mapH = LEGACY_UI_MAP_RECT.h * scale;
  legacyWorldSurface.style.width = `${outW}px`;
  legacyWorldSurface.style.height = `${outH}px`;
  legacyViewportCanvas.style.left = `${mapX}px`;
  legacyViewportCanvas.style.top = `${mapY}px`;
  legacyViewportCanvas.style.width = `${mapW}px`;
  legacyViewportCanvas.style.height = `${mapH}px`;
}

function renderLegacyHudStubOnBackdrop() {
  if (!legacyBackdropCanvas) {
    return;
  }
  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  if (!enabled) {
    return;
  }
  const g = legacyBackdropCanvas.getContext("2d");
  const w = legacyBackdropCanvas.width | 0;
  const h = legacyBackdropCanvas.height | 0;
  if (w <= 0 || h <= 0) {
    return;
  }
  g.imageSmoothingEnabled = false;
  if (state.legacyBackdropBaseCanvas
    && state.legacyBackdropBaseCanvas.width === w
    && state.legacyBackdropBaseCanvas.height === h) {
    g.clearRect(0, 0, w, h);
    g.drawImage(state.legacyBackdropBaseCanvas, 0, 0);
  }
  if (state.legacyHudLayerHidden) {
    return;
  }

  const scale = Math.max(1, Math.floor(w / 320));
  const x = (v) => v * scale;
  const y = (v) => v * scale;
  const drawTile = (tileId, sx, sy) => {
    if (!state.tileSet) {
      return;
    }
    const pal = paletteForTile(tileId);
    const key = paletteKeyForTile(tileId);
    const tc = state.tileSet.tileCanvas(tileId, pal, key);
    if (!tc) {
      return;
    }
    g.drawImage(tc, x(sx), y(sy), x(16), y(16));
  };
  const drawTilePx = (tileId, px, py) => {
    if (!state.tileSet) {
      return;
    }
    const pal = paletteForTile(tileId);
    const key = paletteKeyForTile(tileId);
    const tc = state.tileSet.tileCanvas(tileId, pal, key);
    if (!tc) {
      return;
    }
    g.drawImage(tc, x(px), y(py), x(16), y(16));
  };
  const drawLegacyVista = () => {
    const wz = Number(state?.sim?.world?.map_z) | 0;
    const hour = Number(state?.sim?.world?.time_h) >>> 0;
    const dateD = Math.max(1, Number(state?.sim?.world?.date_d) >>> 0);
    const dateM = Number(state?.sim?.world?.date_m) >>> 0;
    const isEclipse = dateD === 1 && ((dateM % 3) === 0);

    /* Base strip first, same as GR_42(TIL_19B, TIL2SCR(si), 4). */
    for (let i = 0; i < 9; i += 1) {
      drawTilePx(LEGACY_UI_TILE.SLOT_OCCUPIED_BG, i * 16, 4);
    }

    if (wz === 0 || wz === 5) {
      /* Outside strip mountain sky tiles TIL_160..TIL_168. */
      for (let i = 0; i < 9; i += 1) {
        drawTilePx(LEGACY_UI_TILE.SKY_OUTSIDE_BASE + i, i * 16, 4);
      }

      /* Sun: legacy hours 5..19, with sunrise/sunset and eclipse variants. */
      if (hour > 4 && hour < 20) {
        let sunTile = 0x16a;
        if (isEclipse) {
          sunTile = 0x16b;
        } else if (hour === 5 || hour === 19) {
          sunTile = 0x169;
        }
        const sunStep = 19 - (hour | 0);
        if (sunStep >= 0 && sunStep < LEGACY_VISTA_ARC_Y.length) {
          drawTilePx(sunTile, sunStep << 3, LEGACY_VISTA_ARC_Y[sunStep]);
        }
      }

      /* Moons: BaseTile[OBJ_049] + phase, x=(phasePos<<3), y=D_2BFA[phasePos]. */
      if (!isEclipse && state.objectLayer?.baseTiles) {
        const moonBase = Number(state.objectLayer.baseTiles[0x49]) | 0;
        if (moonBase > 0) {
          const phasePair = LEGACY_MOON_PHASE_BY_DAY[(dateD - 1) % LEGACY_MOON_PHASE_BY_DAY.length];
          const phase1 = phasePair[0] | 0;
          const phase2 = phasePair[1] | 0;
          const pos1 = ((phase1 * 3 + 18 - (hour | 0)) % 24 + 24) % 24;
          const pos2 = ((phase2 * 3 + 20 - (hour | 0)) % 24 + 24) % 24;
          if (pos1 >= 0 && pos1 <= 14) {
            drawTilePx(moonBase + phase1, pos1 << 3, LEGACY_VISTA_ARC_Y[pos1]);
          }
          if (pos2 >= 0 && pos2 <= 14) {
            drawTilePx(moonBase + phase2, pos2 << 3, LEGACY_VISTA_ARC_Y[pos2]);
          }
        }
      }
    } else {
      /* Cave strip: TIL_174, middle TIL_175, right TIL_176. */
      drawTilePx(LEGACY_UI_TILE.CAVE_L, 0, 4);
      for (let i = 1; i < 8; i += 1) {
        drawTilePx(LEGACY_UI_TILE.CAVE_M, i * 16, 4);
      }
      drawTilePx(LEGACY_UI_TILE.CAVE_R, 128, 4);
    }

    /* Canonical C_2FC1_19C5 tail: GR_45(0,4,135,19,176,6). */
    const srcX = x(0);
    const srcY = y(4);
    const srcW = x(136);
    const srcH = y(16);
    const dstX = x(176);
    const dstY = y(6);
    g.drawImage(
      legacyBackdropCanvas,
      srcX, srcY, srcW, srcH,
      dstX, dstY, srcW, srcH
    );
  };

  const invFromKey = (key) => {
    const src = String(key || "").trim();
    let m = /^0x([0-9a-f]+):0x?([0-9a-f]+)$/i.exec(src);
    if (!m) {
      /* Back-compat for pre-fix local runtime keys. */
      m = /^obj_([0-9a-f]+)_([0-9a-f]+)$/i.exec(src);
    }
    if (!m || !state.objectLayer || !state.objectLayer.baseTiles) {
      return null;
    }
    const type = parseInt(m[1], 16) & 0x03ff;
    const frame = parseInt(m[2], 16) & 0x00ff;
    const base = state.objectLayer.baseTiles[type] ?? 0;
    if (!base) {
      return null;
    }
    return (base + frame) & 0xffff;
  };
  const invTileFromEntry = (entry) => {
    const direct = parseProbeTileHex(entry?.tile_hex);
    if (direct != null) {
      return direct;
    }
    return invFromKey(entry?.key);
  };
  const buildDisplayInventoryEntries = () => {
    const out = [];
    const seen = new Set();
    const inv = state.sim && state.sim.inventory ? state.sim.inventory : null;
    if (inv) {
      /* Prefer local runtime state so Get/Drop feedback is immediately visible. */
      for (const [k, v] of Object.entries(inv)) {
        const key = String(k || "");
        const count = Number(v) >>> 0;
        if (!key || count <= 0 || seen.has(key)) {
          continue;
        }
        seen.add(key);
        out.push({ key, count });
        if (out.length >= 12) {
          return out;
        }
      }
    }
    const baseEntries = probe.canonical_ui?.inventory_panel?.entries || [];
    for (const e of baseEntries) {
      if (!e || !e.key) continue;
      const key = String(e.key);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, count: Number(e.count) | 0, tile_hex: e.tile_hex });
      if (out.length >= 12) {
        break;
      }
    }
    return out;
  };
  const statusDisplay = Number(state.legacyStatusDisplay) | 0;
  const showVista = (
    statusDisplay === LEGACY_STATUS_DISPLAY.CMD_91
    || statusDisplay === LEGACY_STATUS_DISPLAY.CMD_9E
  );
  if (showVista) {
    drawLegacyVista();
  }
  const probe: UiProbeContractRuntime = getUiProbeForRender();
  const conversationPanel = (probe.canonical_ui?.conversation_panel || {}) as {
    target_name?: string | null;
  };
  const panelLayout = buildLegacyInventoryPaperdollLayoutRuntime({
    statusDisplay,
    talkStatusDisplay: LEGACY_STATUS_DISPLAY.CMD_9E,
    talkShowInventory: state.legacyConversationShowInventory !== false
  });
  const inTalkPanel = panelLayout.inTalkPanel;
  const panelShowEquipment = panelLayout.showEquipment;
  const panelShowBagGrid = panelLayout.showBagGrid;
  const equipmentOffsetY = panelLayout.equipOffsetY;

  /* C_155D_028A / C_155D_1065: centered name row only in CMD_90/CMD_92. */
  if (statusDisplay === LEGACY_STATUS_DISPLAY.CMD_90 || statusDisplay === LEGACY_STATUS_DISPLAY.CMD_92) {
    const avatarLabel = sanitizeLegacyHudLabelText(String(state.net.characterName || "Avatar")) || "Avatar";
    const labelX = 176 + Math.max(0, Math.floor((136 - (avatarLabel.length * 8)) / 2));
    drawU6MainText(g, avatarLabel, x(labelX), y(8), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  } else if (inTalkPanel) {
    const talkLabel = sanitizeLegacyHudLabelText(String(conversationPanel.target_name || state.legacyConversationTargetName || "Converse")) || "Converse";
    const labelX = 176 + Math.max(0, Math.floor((136 - (talkLabel.length * 8)) / 2));
    drawU6MainText(g, talkLabel, x(labelX), y(88), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  }

  /* Canonical dynamic payload only: inventory/equipment/portrait cells on top of paper frame. */
  let portraitSlotX = panelLayout.portrait.x;
  let portraitSlotY = panelLayout.portrait.y;
  let portraitW = panelLayout.portrait.w;
  let portraitH = panelLayout.portrait.h;
  if (inTalkPanel) {
    const portrait = conversationPortraitCanvas(conversationPanel);
    if (portrait) {
      g.drawImage(
        portrait,
        0,
        0,
        portrait.width,
        portrait.height,
        x(portraitSlotX),
        y(portraitSlotY),
        x(portraitW),
        y(portraitH)
      );
    }
  } else {
    const avatarTile = avatarRenderTileId();
    if (avatarTile != null) {
      drawTile(avatarTile, portraitSlotX, portraitSlotY);
    }
  }

  if (panelShowEquipment) {
    /* C_2FC1_1EAF(192,32) in CMD_92, C_2FC1_1EAF(192,40) in talk-inventory mode. */
    drawTile(LEGACY_UI_TILE.EQUIP_UL, 192, 32 + equipmentOffsetY);
    drawTile(LEGACY_UI_TILE.EQUIP_UR, 208, 32 + equipmentOffsetY);
    drawTile(LEGACY_UI_TILE.EQUIP_DL, 192, 48 + equipmentOffsetY);
    drawTile(LEGACY_UI_TILE.EQUIP_DR, 208, 48 + equipmentOffsetY);
  }

  /* Canonical equipment layout from C_155D_08F4/C_155D_130E, with probe-driven payload tiles. */
  const slotByKey = new Map();
  const slotKeyByIndex = [
    "head",
    "neck",
    "right_hand",
    "right_finger",
    "chest",
    "left_hand",
    "left_finger",
    "feet"
  ];
  const panelSlots = inTalkPanel
    ? (Array.isArray(state.legacyConversationEquipmentSlots) ? state.legacyConversationEquipmentSlots : [])
    : (probe.canonical_ui?.paperdoll_panel?.slots || []);
  for (const s of panelSlots) {
    if (s && s.key != null) {
      slotByKey.set(String(s.key), s);
      continue;
    }
    const slotIndex = Number(s?.slot);
    if (Number.isFinite(slotIndex) && slotIndex >= 0 && slotIndex < slotKeyByIndex.length) {
      slotByKey.set(slotKeyByIndex[slotIndex], s);
    }
  }
  const equipSlots = panelLayout.equipSlots.map((slot) => ({
    key: slot.key,
    index: slot.slot,
    sx: slot.x,
    sy: slot.y
  }));
  if (panelShowEquipment) {
    for (const s of equipSlots) {
      drawTile(LEGACY_UI_TILE.SLOT_EMPTY, s.sx, s.sy);
      const slot = slotByKey.get(s.key);
      const tile = parseProbeTileHex(slot?.tile_hex);
      if (tile != null) {
        drawTile(LEGACY_UI_TILE.SLOT_OCCUPIED_BG, s.sx, s.sy);
        drawTile(tile, s.sx, s.sy);
      }
    }
  }

  /* Canonical inventory grid from C_155D_0CF5/C_155D_1267. */
  const invEntries = buildDisplayInventoryEntries();
  if (panelShowBagGrid) {
    for (const cell of panelLayout.inventoryCells) {
      const sx = cell.x;
      const sy = cell.y;
      drawTile(LEGACY_UI_TILE.SLOT_EMPTY, sx, sy);
      const entry = invEntries[cell.index];
      if (!entry) {
        continue;
      }
      const tile = invTileFromEntry(entry);
      if (tile != null) {
        drawTile(LEGACY_UI_TILE.SLOT_OCCUPIED_BG, sx, sy);
        drawTile(tile, sx, sy);
      }
    }
  }

  if (state.legacyHudSelection) {
    g.strokeStyle = "#f59e0b";
    g.lineWidth = Math.max(1, scale);
    const sel = state.legacyHudSelection;
    if (sel.kind === "inventory") {
      const cell = panelLayout.inventoryCells.find((it) => (it.index | 0) === (sel.index | 0));
      if (cell) {
        g.strokeRect(x(cell.x) + 1, y(cell.y) + 1, x(cell.w) - 2, y(cell.h) - 2);
      }
    } else if (sel.kind === "portrait") {
      g.strokeRect(x(portraitSlotX) + 1, y(portraitSlotY) + 1, x(portraitW) - 2, y(portraitH) - 2);
    } else if (sel.kind === "equip") {
      const e = equipSlots.find((it) => (it.index | 0) === (sel.slot | 0));
      if (e) {
        g.strokeRect(x(e.sx) + 1, y(e.sy) + 1, x(16) - 2, y(16) - 2);
      }
    }
  }

  if (statusDisplay === LEGACY_STATUS_DISPLAY.CMD_92) {
    /* C_155D_0CF5: E:/I: weight lines in clip D_B6B5[1], row 9. */
    const equipSlotsForWeight = probe.canonical_ui?.paperdoll_panel?.slots || [];
    const invEntriesForWeight = invEntries;
    const equippedCount = equipSlotsForWeight.filter((s) => parseProbeTileHex(s?.tile_hex) != null).length;
    const invCount = invEntriesForWeight.filter((e) => e && e.key).length;
    const derivedEquip = Math.max(0, equippedCount);
    const derivedTotal = Math.max(0, equippedCount + invCount);
    const equipWeight = Number.isFinite(Number(probe?.canonical_ui?.avatar_panel?.avatar?.equip_weight))
      ? (Number(probe.canonical_ui.avatar_panel.avatar.equip_weight) | 0)
      : derivedEquip;
    const totalWeight = Number.isFinite(Number(probe?.canonical_ui?.avatar_panel?.avatar?.total_weight))
      ? (Number(probe.canonical_ui.avatar_panel.avatar.total_weight) | 0)
      : derivedTotal;
    const strength = Number.isFinite(Number(probe?.canonical_ui?.avatar_panel?.avatar?.strength))
      ? Math.max(1, Number(probe.canonical_ui.avatar_panel.avatar.strength) | 0)
      : 10;
    const eText = `${equipWeight}/${strength}s`;
    const iText = `${totalWeight}/${Math.max(1, strength * 2)}s`;
    drawU6MainText(g, "E:", x(176), y(80), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
    drawU6MainText(g, eText, x(192), y(80), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
    drawU6MainText(g, "I:", x(248), y(80), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
    drawU6MainText(g, iText, x(264), y(80), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);

    /* C_155D_1065: engagement icons row. */
    const partyMembers = probe.canonical_ui?.party_panel?.members || [];
    const activePartyIndex = Number(probe?.canonical_ui?.avatar_panel?.avatar?.party_index) | 0;
    const partyCountRaw = partyMembers.length > 0
      ? partyMembers.length
      : Math.max(1, Number(probe?.canonical_ui?.avatar_panel?.avatar?.party_count) | 0);
    /* Runtime party bridge is pending; avoid dropping the "next member" icon in live mode scaffolding. */
    const partyCount = (state.uiProbeMode === "live" && partyCountRaw === 1) ? 2 : partyCountRaw;
    if (activePartyIndex > 0) {
      drawTile(LEGACY_POSTURE_ICONS[0], 176, 88);
    }
    drawTile(LEGACY_POSTURE_ICONS[1], 192, 88);
    drawTile(LEGACY_POSTURE_ICONS[2], 208, 88);
    if ((partyCount - 1) > activePartyIndex) {
      drawTile(LEGACY_POSTURE_ICONS[3], 224, 88);
    }
    if (activePartyIndex > 0) {
      drawTile(LEGACY_POSTURE_ICONS[4], 240, 88);
    }

    /* C_155D_01BC: combat mode text row in right-lower panel. */
    const modeLabelRaw = String(state.legacyCombatModeLabel || "ASSAULT").toUpperCase();
    const modeLabel = LEGACY_COMBAT_MODE_LABELS.includes(modeLabelRaw) ? modeLabelRaw : "ASSAULT";
    /* STAT_refreshComMode: gotoxy((8-len)/2 + 10, 11) in D_B6B5[1]. */
    const modeCol = (Math.trunc((8 - modeLabel.length) / 2) + 10) | 0;
    const modeX = 176 + (modeCol * 8);
    drawU6MainText(g, modeLabel, x(modeX), y(96), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  }

  /* Legacy ledger clip D_B6B5[3] spans char cells (22..38,14..23) => px 176..304,112..184. */
  if (state.legacyLedgerLines.length) {
    for (let i = 0; i < state.legacyLedgerLines.length && i < LEGACY_LEDGER_MAX_LINES; i += 1) {
      drawU6MainText(
        g,
        state.legacyLedgerLines[i],
        x(176),
        y(112 + (i * 8)),
        Math.max(1, scale),
        LEGACY_HUD_TEXT_COLOR
      );
    }
  }
  const allowTalkPrompt = (statusDisplay === LEGACY_STATUS_DISPLAY.CMD_9E) || state.legacyConversationActive;
  if (state.legacyLedgerPrompt && allowTalkPrompt) {
    const ankhGlyph = String.fromCharCode(5 + ((state.legacyPromptAnimPhase | 0) & 3));
    if (state.legacyConversationActive) {
      const activeLineIndex = Math.max(0, ((state.legacyLedgerLines.length | 0) - 1));
      const lineIndex = Math.min(LEGACY_LEDGER_MAX_LINES - 1, activeLineIndex);
      const py = 112 + (lineIndex * 8);
      const activeLineText = String(state.legacyLedgerLines[activeLineIndex] || "");
      const prefixChars = Math.min(LEGACY_LEDGER_MAX_CHARS - 1, activeLineText.length | 0);
      const promptX = 176 + (prefixChars * 8);
      const inputMax = Math.max(0, LEGACY_LEDGER_MAX_CHARS - prefixChars - 1);
      const input = String(state.legacyConversationInput || "").slice(0, inputMax);
      if (input.length === 0) {
        drawU6MainText(g, ankhGlyph, x(promptX), y(py), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
      }
      drawU6MainText(g, input, x(promptX + 8), y(py), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
    } else {
      const lineIndex = Math.min(LEGACY_LEDGER_MAX_LINES - 1, state.legacyLedgerLines.length | 0);
      const py = 112 + (lineIndex * 8);
      drawU6MainText(g, ">", x(176), y(py), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
      drawU6MainText(g, ankhGlyph, x(184), y(py), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
    }
  } else if (state.legacyConversationActive && state.legacyConversationPaging) {
    const py = 112 + ((LEGACY_LEDGER_MAX_LINES - 1) * 8);
    /* Blink using the same cadence clock as prompt animation. */
    if (((state.legacyPromptAnimPhase | 0) & 0x02) === 0) {
      drawLegacyContinueArrow(g, x(176), y(py), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
    }
  }

  /* Canonical verb button strip under world viewport. */
  for (let i = 0; i < 9; i += 1) {
    drawTile(LEGACY_UI_TILE.BUTTON_ATTACK_BASE + i, 8 + (i * 16), 176);
  }
  drawTile(LEGACY_UI_TILE.BUTTON_RIGHT, 152, 176);
}

function drawLegacyTileScaled(g, tileId, sx, sy, scale) {
  if (!state.tileSet) {
    return;
  }
  const pal = paletteForTile(tileId);
  const key = paletteKeyForTile(tileId);
  const tc = state.tileSet.tileCanvas(tileId, pal, key);
  if (!tc) {
    return;
  }
  g.drawImage(tc, sx, sy, 16 * scale, 16 * scale);
}

function renderStartupMenuLayer(g, scale) {
  const x = (v) => v * scale;
  const y = (v) => v * scale;

  const startupPal = buildStartupPaletteForMenu();
  const hasStartupArt = startupPal
    && state.startupTitlePixmaps
    && state.startupTitlePixmaps[0]
    && state.startupTitlePixmaps[1]
    && state.startupMenuPixmap;
  g.fillStyle = "#000000";
  g.fillRect(0, 0, x(320), y(200));
  if (hasStartupArt) {
    const drawSprite = (key, pixmap, sx, sy) => {
      if (!pixmap) {
        return;
      }
      const cacheKey = `${key}:${state.startupMenuIndex}`;
      let sprite = state.startupCanvasCache.get(cacheKey);
      if (!sprite) {
        sprite = canvasFromIndexedPixels(pixmap, startupPal, 0xff);
        state.startupCanvasCache.set(cacheKey, sprite);
      }
      if (!sprite) {
        return;
      }
      g.drawImage(sprite, x(sx), y(sy), x(sprite.width), y(sprite.height));
    };
    drawSprite("title", state.startupTitlePixmaps[0], 0x13, 0x00);
    drawSprite("subtitle", state.startupTitlePixmaps[1], 0x3b, 0x2f);
    drawSprite("menu", state.startupMenuPixmap, 0x31, 0x53);
    return;
  }

  for (let i = 0; i < 20; i += 1) {
    drawLegacyTileScaled(g, LEGACY_UI_TILE.SLOT_EMPTY, x(i * 16), 0, scale);
    drawLegacyTileScaled(g, LEGACY_UI_TILE.SLOT_EMPTY, x(i * 16), y(184), scale);
  }
  for (let i = 1; i < 11; i += 1) {
    drawLegacyTileScaled(g, LEGACY_UI_TILE.SLOT_EMPTY, 0, y(i * 16), scale);
    drawLegacyTileScaled(g, LEGACY_UI_TILE.SLOT_EMPTY, x(304), y(i * 16), scale);
  }

  drawU6MainText(g, "ULTIMA VI", x(112), y(30), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);
  drawU6MainText(g, "THE FALSE PROPHET", x(94), y(44), Math.max(1, scale), LEGACY_HUD_TEXT_COLOR);

  for (let i = 0; i < STARTUP_MENU.length; i += 1) {
    const item = STARTUP_MENU[i];
    const enabled = startupMenuItemEnabledRuntime(item, isNetAuthenticated());
    const rowY = 74 + (i * 20);
    const selected = i === state.startupMenuIndex;
    g.fillStyle = selected ? "#5f2e1d" : "#1f1a14";
    g.fillRect(x(62), y(rowY), x(196), y(16));
    g.strokeStyle = selected ? "#d7b981" : "#6a5131";
    g.strokeRect(x(62) + 0.5, y(rowY) + 0.5, x(196) - 1, y(16) - 1);
    if (selected) {
      drawU6MainText(g, ">>", x(68), y(rowY + 4), Math.max(1, scale), "#f2dfb6");
    }
    const textColor = enabled ? (selected ? "#f2dfb6" : "#d8be8a") : "#76644a";
    drawU6MainText(g, item.label, x(86), y(rowY + 4), Math.max(1, scale), textColor);
  }

  drawU6MainText(g, "Use ARROWS + ENTER", x(98), y(162), Math.max(1, scale), "#8e7a55");
}

function buildStartupPaletteForMenu() {
  return buildStartupPaletteForMenuRuntime(state.basePalette, state.startupMenuIndex);
}

function activeTitleIntroPalette(scene = null) {
  return activeBootIntroPaletteRuntime({
    basePalette: state.basePalette,
    fallbackPalette: buildStartupPaletteForMenu(),
    introPalettes: state.bootIntroPalettes,
    scene,
    sceneElapsedMs: Number(state.bootIntro?.sceneElapsedMs) | 0
  });
}

function bootIntroPaletteCacheKey(scene = null) {
  return bootIntroPaletteCacheKeyRuntime(scene, Number(state.bootIntro?.sceneElapsedMs) | 0);
}

function bootIntroSceneSpriteCanvas(bankName, frameIdx, scene = null) {
  const banks = state.bootIntroBanks;
  const bank = banks && typeof banks === "object" ? banks[bankName] : null;
  const pixmap = Array.isArray(bank) ? bank[frameIdx] : null;
  const pal = activeTitleIntroPalette(scene);
  if (!pixmap || !pal) {
    return null;
  }
  const cacheKey = `${bankName}:${frameIdx}:${bootIntroPaletteCacheKey(scene)}`;
  let sprite = state.bootIntroCanvasCache.get(cacheKey);
  if (!sprite) {
    sprite = canvasFromIndexedPixels(pixmap, pal, 0xff);
    if (sprite) {
      state.bootIntroCanvasCache.set(cacheKey, sprite);
    }
  }
  return sprite || null;
}

function bootIntroBlockSpriteCanvas(frameIdx, scene = null) {
  const bank = state.bootIntroBlocks;
  const pixmap = Array.isArray(bank) ? bank[frameIdx] : null;
  const pal = activeTitleIntroPalette(scene);
  if (!pixmap || !pal) {
    return null;
  }
  const cacheKey = `blocks:${frameIdx}:${bootIntroPaletteCacheKey(scene)}`;
  let sprite = state.bootIntroCanvasCache.get(cacheKey);
  if (!sprite) {
    sprite = canvasFromIndexedPixels(pixmap, pal, 0xff);
    if (sprite) {
      state.bootIntroCanvasCache.set(cacheKey, sprite);
    }
  }
  return sprite || null;
}

function drawBootIntroSprite(g, bankName, frameIdx, lx, ly, scale, scene = null, sw = null, sh = null, alpha = 1) {
  const sprite = bootIntroSceneSpriteCanvas(bankName, frameIdx, scene);
  if (!sprite) {
    return;
  }
  const prevAlpha = g.globalAlpha;
  g.globalAlpha = Math.max(0, Math.min(1, alpha));
  const sx = Math.round((Number(lx) || 0) * scale);
  const sy = Math.round((Number(ly) || 0) * scale);
  const dw = Math.round((sw == null ? sprite.width : sw) * scale);
  const dh = Math.round((sh == null ? sprite.height : sh) * scale);
  g.drawImage(
    sprite,
    sx,
    sy,
    dw,
    dh
  );
  g.globalAlpha = prevAlpha;
}

function bootIntroTvStateAt(updateCount) {
  return bootIntroTvStateAtRuntime(updateCount);
}

function drawBootIntroClippedSprite(g, bankName, frameIdx, lx, ly, scale, scene, clipX, clipY, clipW, clipH) {
  g.save();
  g.beginPath();
  g.rect(Math.round(clipX * scale), Math.round(clipY * scale), Math.round(clipW * scale), Math.round(clipH * scale));
  g.clip();
  drawBootIntroSprite(g, bankName, frameIdx, lx, ly, scale, scene);
  g.restore();
}

function drawBootIntroTvStatic(g, x, y, scale, seed) {
  const pal = activeTitleIntroPalette({ kind: "lounge" }) || [];
  const cell = Math.max(1, scale | 0);
  for (const staticCell of bootIntroTvStaticCellsRuntime(seed)) {
    const idx = staticCell.colorIndex;
    const rgb = pal[idx] || (idx ? [230, 209, 160] : [0, 0, 0]);
    g.fillStyle = `rgb(${rgb[0] | 0}, ${rgb[1] | 0}, ${rgb[2] | 0})`;
    g.fillRect(Math.round((x + staticCell.px) * scale), Math.round((y + staticCell.py) * scale), cell, cell);
  }
}

function decodeBootIntroWouFont(bytes) {
  return decodeBootIntroWouFontRuntime(bytes, decompressU6Lzw);
}

function bootIntroWouCharWidth(font, code) {
  return bootIntroWouCharWidthRuntime(font, code);
}

function measureBootIntroTextWidth(text) {
  return measureBootIntroTextWidthRuntime(state.bootIntroFont, text, (fallbackText) => measureU6TextWidth(fallbackText, true));
}

function drawBootIntroWouText(g, text, sx, sy, scale = 1, color = "#e7dcc0") {
  return drawBootIntroWouTextRuntime(g, {
    color,
    drawFallbackText: (ctx, fallbackText, x, y, s, c) => drawU6CompactText(ctx, fallbackText, x, y, s, c),
    fallbackMeasure: (fallbackText) => measureU6TextWidth(fallbackText, true),
    font: state.bootIntroFont,
    scale,
    sx,
    sy,
    text
  });
}

function drawBootIntroTextRun(g, text, x, y, scale, color) {
  const endX = drawBootIntroWouText(g, text, Math.round(x * scale), Math.round(y * scale), Math.max(1, scale), color);
  return Math.round(endX / Math.max(1, scale));
}

function bootIntroPrintText(g, text, startX, width, x, y, scale, color) {
  const font = state.bootIntroFont;
  return bootIntroPrintTextRuntime(g, {
    color,
    drawTextRun: drawBootIntroTextRun,
    measureText: measureBootIntroTextWidth,
    scale,
    spaceWidth: font ? bootIntroWouCharWidth(font, 32) : measureU6TextWidth(" ", true),
    startX,
    text,
    width,
    x,
    y
  });
}

function bootIntroPrintTextOnCard(g, cardX, cardY, text, startX, width, x, y, scale, color) {
  const font = state.bootIntroFont;
  return bootIntroPrintTextOnCardRuntime(g, {
    cardX,
    cardY,
    color,
    drawTextRun: drawBootIntroTextRun,
    measureText: measureBootIntroTextWidth,
    scale,
    spaceWidth: font ? bootIntroWouCharWidth(font, 32) : measureU6TextWidth(" ", true),
    startX,
    text,
    width,
    x,
    y
  });
}

function bootIntroClockFrames(now = new Date()) {
  return bootIntroClockFramesRuntime(now);
}

function drawBootIntroClock(g, scene, scale, scrollPx) {
  for (const sprite of bootIntroClockSpritesRuntime(new Date(), scrollPx)) {
    drawBootIntroSprite(g, "intro1", sprite.frame, sprite.x, sprite.y, scale, scene);
  }
}

function bootIntroWindowSceneBase(sceneId) {
  return bootIntroWindowSceneBaseRuntime(sceneId);
}

function bootIntroWindowStateAt(scene, updateCount, forceStrike) {
  return bootIntroWindowStateAtRuntime(scene, updateCount, forceStrike);
}

function wrapBootIntroTextPixels(text, maxWidthPx) {
  return wrapBootIntroTextPixelsRuntime(text, maxWidthPx, measureBootIntroTextWidth);
}

function renderBootIntroTextCard(g, scale, scene, card) {
  const plan = buildBootIntroTextCardRenderPlanRuntime({
    card,
    measureText: measureBootIntroTextWidth,
    scale,
    textColor: activeTitleIntroPalette(scene)?.[0x3e] || [0xe6, 0xd1, 0xa0],
    wrapText: wrapBootIntroTextPixels
  });
  if (!plan) {
    return;
  }
  const panel = plan.panel ? bootIntroBlockSpriteCanvas(plan.panel.frame, scene) : null;
  if (panel && plan.panel) {
    g.drawImage(
      panel,
      plan.panel.x,
      plan.panel.y,
      Math.round(panel.width * scale),
      Math.round(panel.height * scale)
    );
  }
  if (plan.printOps.length) {
    let last = { x: 0, y: 0 };
    for (const op of plan.printOps) {
      const opX = (Number(op.x) | 0) >= 0 ? (Number(op.x) | 0) : last.x;
      const opY = (Number(op.y) | 0) >= 0 ? (Number(op.y) | 0) : last.y;
      last = bootIntroPrintTextOnCard(
        g,
        Number(card.x) || 0,
        Number(card.y) || 0,
        op.text,
        op.startX,
        op.width,
        opX,
        opY,
        Math.max(1, scale),
        plan.color
      );
    }
    return;
  }
  for (const line of plan.lines) {
    drawBootIntroWouText(
      g,
      line.text,
      line.drawX,
      line.y,
      Math.max(1, scale),
      plan.color
    );
  }
}

function renderBootIntroSplash(g, scene, scale) {
  const frame = Number(scene?.splashFrame) | 0;
  const sprite = bootIntroSceneSpriteCanvas("intro1", frame, scene);
  g.fillStyle = "#000000";
  g.fillRect(0, 0, 320 * scale, 200 * scale);
  if (!sprite) {
    return;
  }
  const sx = Math.floor(((320 * scale) - (sprite.width * scale)) / 2);
  const sy = Math.floor(((200 * scale) - (sprite.height * scale)) / 2);
  g.drawImage(sprite, sx, sy, sprite.width * scale, sprite.height * scale);
}

function renderBootIntroLounge(g, scene, scale) {
  const elapsed = Number(state.bootIntro?.sceneElapsedMs) | 0;
  const scrollPx = (scene?.id === "lounge_pan")
    ? Math.min(319, Math.floor((elapsed / Math.max(1, scene.autoAdvanceMs || 1)) * 319))
    : 0;
  const tvBaseX = 0xe5 - scrollPx;
  const tvBaseY = 0x32;
  const tvSceneBase = scene?.id === "lounge_reflection" ? 120 : (scene?.id === "lounge_pan" ? 240 : 0);
  const tvUpdate = tvSceneBase + Math.floor(elapsed / 100);
  const tvState = bootIntroTvStateAt(tvUpdate);
  g.fillStyle = "#000000";
  g.fillRect(0, 0, 320 * scale, 200 * scale);
  drawBootIntroSprite(g, "intro1", 15, 210 - Math.max(0, scrollPx - 160), 0, scale, scene);
  drawBootIntroSprite(g, "intro1", 0, -scrollPx, 0, scale, scene);
  drawBootIntroSprite(g, "intro1", 1, 320 - scrollPx, 0, scale, scene);
  drawBootIntroSprite(g, "intro1", 13, -Math.floor(scrollPx * 2), 63, scale, scene);
  drawBootIntroSprite(g, "intro1", 14, 143 - Math.floor(scrollPx * 2), 91, scale, scene);
  const clipX = Math.max(0, tvBaseX);
  if (tvState.staticVisible) {
    g.save();
    g.beginPath();
    g.rect(Math.round(clipX * scale), Math.round(tvBaseY * scale), Math.round(57 * scale), Math.round(37 * scale));
    g.clip();
    drawBootIntroTvStatic(g, tvBaseX, tvBaseY, scale, 0x9e3779b9 ^ tvUpdate);
    g.restore();
  }
  for (const tvSprite of tvState.sprites) {
    drawBootIntroClippedSprite(
      g,
      "intro1",
      tvSprite.frame,
      tvBaseX + tvSprite.xOff,
      tvBaseY + tvSprite.yOff,
      scale,
      scene,
      clipX,
      tvBaseY,
      57,
      37
    );
  }
  if (tvState.fingerVisible) {
    drawBootIntroSprite(g, "intro1", 0x0e, 143 - Math.floor(scrollPx * 2), 91, scale, scene);
  }
  drawBootIntroClock(g, scene, scale, scrollPx);
}

function renderBootIntroWindow(g, scene, scale) {
  const elapsed = Number(state.bootIntro?.sceneElapsedMs) | 0;
  const panPx = (scene?.id === "window_pan")
    ? Math.min(320, Math.floor((elapsed / Math.max(1, scene.autoAdvanceMs || 1)) * 320))
    : ((scene?.id === "window_door_open" || scene?.id === "window_run") ? 320 : 0);
  const doorOpenPx = (scene?.id === "window_door_open")
    ? Math.min(68, Math.floor((elapsed / Math.max(1, scene.autoAdvanceMs || 1)) * 68))
    : (scene?.id === "window_run" ? 68 : 0);
  const strikeVisible = scene?.id === "window_strike"
    || (scene?.id === "window_pan" && panPx <= 160);
  const updateCount = bootIntroWindowSceneBase(scene?.id) + Math.floor(elapsed / 80);
  const windowState = bootIntroWindowStateAt(scene, updateCount, strikeVisible);
  g.fillStyle = "#000000";
  g.fillRect(0, 0, 320 * scale, 200 * scale);
  drawBootIntroSprite(g, "intro2", 1, 0, 0, scale, scene);
  drawBootIntroSprite(g, "intro2", 0, windowState.cloudX, -5, scale, scene);
  drawBootIntroSprite(g, "intro2", 0, windowState.cloudX - 320, -5, scale, scene);
  drawBootIntroSprite(g, "intro2", 10, 0, 0x4c, scale, scene);
  drawBootIntroSprite(g, "intro2", 8, 0, 0, scale, scene);
  for (const cloud of windowState.clouds) {
    drawBootIntroSprite(g, "intro2", cloud.frame, cloud.x, cloud.y, scale, scene);
  }
  if (windowState.lightningVisible) {
    drawBootIntroSprite(g, "intro2", windowState.lightningFrame, windowState.lightningDrawX, windowState.lightningDrawY, scale, scene);
  }
  if (strikeVisible) {
    drawBootIntroSprite(g, "intro2", windowState.strikeFrame, 158, 114, scale, scene);
  }
  for (const drop of windowState.rain) {
    drawBootIntroSprite(g, "intro2", drop.frame, drop.x, drop.y, scale, scene);
  }
  drawBootIntroSprite(g, "intro2", 28, -panPx, 0, scale, scene);
  drawBootIntroSprite(g, "intro2", windowState.windowFrame, 0x39 - panPx, 0, scale, scene);
  drawBootIntroSprite(g, "intro2", 24, 320 - panPx - doorOpenPx, 0, scale, scene);
  drawBootIntroSprite(g, "intro2", 25, 573 - panPx + doorOpenPx, 0, scale, scene);
}

function renderBootIntroStones(g, scene, scale) {
  const elapsed = Number(state.bootIntro?.sceneElapsedMs) | 0;
  const gateRisePx = (scene?.id === "stones_gate")
    ? Math.max(5, 0x64 - Math.floor(elapsed / 25))
    : ((scene?.id === "stones_warning" || scene?.id === "stones_sink" || scene?.id === "stones_decision" || scene?.id === "stones_enter") ? 5 : 0x64);
  const gateSinkPx = (scene?.id === "stones_enter")
    ? Math.min(0x64, 5 + Math.floor(elapsed / 25))
    : gateRisePx;
  const gateRiseDoneMs = (0x64 - 0x05) * 25;
  const handY = (scene?.id === "stones_pickup")
    ? Math.max(0x54, 0xc7 - Math.floor(elapsed / 18) * 2)
    : (scene?.id === "stones_gate"
      ? Math.min(0xc7, 0x54 + Math.max(0, Math.floor((elapsed - gateRiseDoneMs) / 25)) * 2)
      : ((scene?.id === "stones_memory") ? 0x44 : 0xc7));
  g.fillStyle = "#000000";
  g.fillRect(0, 0, 320 * scale, 200 * scale);
  const bgFrame = (scene?.id === "stones_gate" || scene?.id === "stones_memory" || scene?.id === "stones_warning" || scene?.id === "stones_sink" || scene?.id === "stones_decision" || scene?.id === "stones_enter") ? 5 : 0;
  drawBootIntroSprite(g, "intro3", bgFrame, 0, 0, scale, scene);
  if (scene?.id !== "stones_gate" && scene?.id !== "stones_memory" && scene?.id !== "stones_warning" && scene?.id !== "stones_sink" && scene?.id !== "stones_decision" && scene?.id !== "stones_enter") {
    drawBootIntroSprite(g, "intro3", 3, 0x96, 0x64, scale, scene);
  }
  if (scene?.id === "stones_gate" || scene?.id === "stones_memory" || scene?.id === "stones_warning" || scene?.id === "stones_sink" || scene?.id === "stones_decision" || scene?.id === "stones_enter") {
    drawBootIntroSprite(g, "intro3", 4, 0x5e, 0x66, scale, scene);
  }
  if (scene?.id === "stones_pickup" || scene?.id === "stones_gate" || scene?.id === "stones_memory") {
    const handFrame = scene?.id === "stones_memory" ? 6 : 1;
    const handX = scene?.id === "stones_memory" ? 0x9b : 0xbd;
    drawBootIntroSprite(g, "intro3", handFrame, handX, handY, scale, scene);
  }
  if (scene?.id === "stones_gate" || scene?.id === "stones_memory" || scene?.id === "stones_warning" || scene?.id === "stones_sink" || scene?.id === "stones_decision" || scene?.id === "stones_enter") {
    const shake = (scene?.id === "stones_sink" || scene?.id === "stones_decision" || scene?.id === "stones_enter")
      ? (Math.floor(elapsed / 80) % 2)
      : 0;
    const gateY = (scene?.id === "stones_enter") ? gateSinkPx : gateRisePx;
    drawBootIntroClippedSprite(g, "intro3", 2, 0x7c + shake, gateY, scale, scene, 0, 0, 320, 0x66);
  }
  if (scene?.id === "stones_enter") {
    const avatarFrame = 7 + Math.min(19, Math.floor(elapsed / 180));
    const avatarAlpha = Math.max(0, 1 - Math.max(0, elapsed - 2400) / 1200);
    drawBootIntroSprite(g, "intro3", avatarFrame, -2, Math.max(-20, 0x12 - Math.floor(elapsed / 60)), scale, scene, null, null, avatarAlpha);
  }
}

function renderBootIntroLayer(g, scale) {
  const scene = currentBootIntroSceneRuntime(state.bootIntro);
  if (!scene) {
    renderStartupMenuLayer(g, scale);
    return;
  }
  if (scene.kind === "splash") {
    renderBootIntroSplash(g, scene, scale);
  } else if (scene.kind === "lounge") {
    renderBootIntroLounge(g, scene, scale);
  } else if (scene.kind === "window") {
    renderBootIntroWindow(g, scene, scale);
  } else {
    renderBootIntroStones(g, scene, scale);
  }
  renderBootIntroTextCard(g, scale, scene, scene.textCard || null);
  const overlayAlpha = bootIntroOverlayAlphaRuntime(state.bootIntro);
  if (overlayAlpha > 0) {
    g.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, overlayAlpha / 255))})`;
    g.fillRect(0, 0, 320 * scale, 200 * scale);
  }
}

function renderStartupScreen() {
  const mainScale = Math.max(1, Math.floor(canvas.width / 320));
  if (state.bootIntro && state.bootIntro.active) {
    renderBootIntroLayer(ctx, mainScale);
  } else {
    renderStartupMenuLayer(ctx, mainScale);
  }

  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  if (!enabled || !legacyBackdropCanvas) {
    return;
  }
  const g = legacyBackdropCanvas.getContext("2d");
  const w = legacyBackdropCanvas.width | 0;
  const h = legacyBackdropCanvas.height | 0;
  if (w <= 0 || h <= 0) {
    return;
  }
  g.imageSmoothingEnabled = false;
  if (state.legacyBackdropBaseCanvas
    && state.legacyBackdropBaseCanvas.width === w
    && state.legacyBackdropBaseCanvas.height === h) {
    g.clearRect(0, 0, w, h);
    g.drawImage(state.legacyBackdropBaseCanvas, 0, 0);
  } else {
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
  }
  const scale = Math.max(1, Math.floor(w / 320));
  if (state.bootIntro && state.bootIntro.active) {
    renderBootIntroLayer(g, scale);
  } else {
    renderStartupMenuLayer(g, scale);
  }

  legacyViewportCanvas.width = 160;
  legacyViewportCanvas.height = 160;
  const lv = legacyViewportCanvas.getContext("2d");
  lv.imageSmoothingEnabled = false;
  lv.clearRect(0, 0, 160, 160);
  lv.drawImage(legacyBackdropCanvas, 8 * scale, 8 * scale, 160 * scale, 160 * scale, 0, 0, 160, 160);
}

function drawCustomCursorOnContext(g, targetW, targetH, opts = null) {
  if (!state.mouseInCanvas || !state.cursorPixmaps || !state.cursorPixmaps.length) {
    return;
  }
  const cursorShape = state.cursorPixmaps[state.cursorIndex] || state.cursorPixmaps[0];
  if (!cursorShape || !state.basePalette || !g || targetW <= 0 || targetH <= 0) {
    return;
  }
  const cursorCanvas = canvasFromIndexedPixels(cursorShape, getRenderPalette() || state.basePalette, 0xff);
  if (!cursorCanvas) {
    return;
  }
  const logicalW = (opts && Number.isFinite(opts.logicalW) && opts.logicalW > 0)
    ? opts.logicalW
    : cursorLogicalWidthRuntime({
      isLegacyFramePreview: isLegacyFramePreviewOn(),
      sessionStarted: state.sessionStarted,
      viewWidthTiles: VIEW_W
    });
  const drawRect = cursorDrawRectRuntime({
    aspectX: CURSOR_ASPECT_X,
    aspectY: CURSOR_ASPECT_Y,
    logicalW,
    mouseNormX: state.mouseNormX,
    mouseNormY: state.mouseNormY,
    mouseX: opts && Number.isFinite(opts.mouseX) ? opts.mouseX : undefined,
    mouseY: opts && Number.isFinite(opts.mouseY) ? opts.mouseY : undefined,
    shape: cursorShape,
    targetH,
    targetW
  });
  if (!drawRect) {
    return;
  }
  g.imageSmoothingEnabled = false;
  g.drawImage(cursorCanvas, drawRect.px, drawRect.py, drawRect.drawW, drawRect.drawH);
}

function drawCustomCursorLayer() {
  if (isLegacyFramePreviewOn()) {
    if (!legacyBackdropCanvas) {
      return;
    }
    const bw = legacyBackdropCanvas.width | 0;
    const bh = legacyBackdropCanvas.height | 0;
    if (bw <= 0 || bh <= 0) {
      return;
    }
    const mx = Math.floor(state.mouseNormX * bw);
    const my = Math.floor(state.mouseNormY * bh);

    if (state.sessionStarted && legacyViewportCanvas) {
      const scale = Math.max(1, Math.floor(bw / 320));
      const mapX = LEGACY_UI_MAP_RECT.x * scale;
      const mapY = LEGACY_UI_MAP_RECT.y * scale;
      const mapW = LEGACY_UI_MAP_RECT.w * scale;
      const mapH = LEGACY_UI_MAP_RECT.h * scale;
      const overMap = mx >= mapX && mx < (mapX + mapW) && my >= mapY && my < (mapY + mapH);
      if (overMap) {
        const vg = legacyViewportCanvas.getContext("2d");
        const vx = (mx - mapX) / scale;
        const vy = (my - mapY) / scale;
        drawCustomCursorOnContext(
          vg,
          legacyViewportCanvas.width | 0,
          legacyViewportCanvas.height | 0,
          { mouseX: vx, mouseY: vy, logicalW: 160 }
        );
        return;
      }
    }
    const g = legacyBackdropCanvas.getContext("2d");
    drawCustomCursorOnContext(g, bw, bh, { mouseX: mx, mouseY: my, logicalW: 320 });
    return;
  }
  drawCustomCursorOnContext(ctx, canvas.width | 0, canvas.height | 0);
}

function composeLegacyViewportFromModernGrid() {
  if (!legacyViewportCanvas || !canvas) {
    return;
  }
  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  if (!enabled) {
    return;
  }

  if (!state.legacyComposeCanvas) {
    state.legacyComposeCanvas = document.createElement("canvas");
    state.legacyComposeCanvas.width = 176;
    state.legacyComposeCanvas.height = 176;
  }
  const compose = state.legacyComposeCanvas;
  const cctx = compose.getContext("2d");
  cctx.imageSmoothingEnabled = false;
  cctx.clearRect(0, 0, 176, 176);
  /* 704 -> 176 is exact /4, keeping tile edge parity intact before crop. */
  cctx.drawImage(canvas, 0, 0, 704, 704, 0, 0, 176, 176);

  if (state.tileSet) {
    const drawFrameTile = (tileId, x, y) => {
      const pal = paletteForTile(tileId);
      const key = paletteKeyForTile(tileId);
      const tc = state.tileSet.tileCanvas(tileId, pal, key);
      if (tc) {
        cctx.drawImage(tc, x, y);
      }
    };

    /* Legacy order from C_0A33_09CE/seg_2FC1: frame overlays drawn over map. */
    drawFrameTile(LEGACY_FRAME_TILES.cornerTL, 0, 0);
    drawFrameTile(LEGACY_FRAME_TILES.cornerTR, 160, 0);
    drawFrameTile(LEGACY_FRAME_TILES.cornerBL, 0, 160);
    drawFrameTile(LEGACY_FRAME_TILES.cornerBR, 160, 160);
    for (let i = 1; i < 10; i += 1) {
      const pos = i * 16;
      drawFrameTile(LEGACY_FRAME_TILES.top, pos, 0);
      drawFrameTile(LEGACY_FRAME_TILES.bottom, pos, 160);
      drawFrameTile(LEGACY_FRAME_TILES.left, 0, pos);
      drawFrameTile(LEGACY_FRAME_TILES.right, 160, pos);
    }
  }

  legacyViewportCanvas.width = 160;
  legacyViewportCanvas.height = 160;
  const lv = legacyViewportCanvas.getContext("2d");
  lv.imageSmoothingEnabled = false;
  lv.clearRect(0, 0, 160, 160);
  /* Legacy map cutout sits at 8,8 with 160x160 size. */
  lv.drawImage(compose, 8, 8, 160, 160, 0, 0, 160, 160);
}

function applyRuntimeProfileState(profile, extensions) {
  state.runtimeProfile = normalizeRuntimeProfile(profile);
  state.runtimeExtensions = sanitizeRuntimeExtensions(extensions);
  document.documentElement.setAttribute("data-runtime-profile", state.runtimeProfile);
}

function initRuntimeProfileConfig() {
  let profile = RUNTIME_PROFILE_CANONICAL_STRICT;
  let extensions = createDefaultRuntimeExtensions();
  try {
    profile = normalizeRuntimeProfile(localStorage.getItem(RUNTIME_PROFILE_KEY) || profile);
    const raw = localStorage.getItem(RUNTIME_EXTENSIONS_KEY);
    if (raw) {
      extensions = sanitizeRuntimeExtensions(JSON.parse(raw));
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }

  try {
    const qs = new URLSearchParams(window.location.search || "");
    if (qs.has("profile")) {
      profile = normalizeRuntimeProfile(qs.get("profile"));
    }
    if (qs.has("ext")) {
      extensions = parseRuntimeExtensionListCsv(qs.get("ext"));
    }
  } catch (_err) {
    // ignore malformed query params
  }

  applyRuntimeProfileState(profile, extensions);
  try {
    localStorage.setItem(RUNTIME_PROFILE_KEY, state.runtimeProfile);
    localStorage.setItem(RUNTIME_EXTENSIONS_KEY, JSON.stringify(state.runtimeExtensions));
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function setTheme(themeName) {
  const theme = THEMES.includes(themeName) ? themeName : "obsidian";
  document.documentElement.setAttribute("data-theme", theme);
  if (themeSelect) {
    themeSelect.value = theme;
  }
  if (wikiLink) {
    wikiLink.href = `/docs/wiki/?theme=${encodeURIComponent(theme)}`;
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initTheme() {
  let saved = "obsidian";
  try {
    const fromStorage = localStorage.getItem(THEME_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setTheme(saved);
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      setTheme(themeSelect.value);
    });
  }
}

function setFont(fontName) {
  const font = FONTS.includes(fontName) ? fontName : "silkscreen";
  document.documentElement.setAttribute("data-font", font);
  if (fontSelect) {
    fontSelect.value = font;
  }
  try {
    localStorage.setItem(FONT_KEY, font);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initFont() {
  let saved = "silkscreen";
  try {
    const fromStorage = localStorage.getItem(FONT_KEY);
    if (fromStorage) {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setFont(saved);
  if (fontSelect) {
    fontSelect.addEventListener("change", () => {
      setFont(fontSelect.value);
    });
  }
}

async function copyTextToClipboard(text) {
  const v = String(text ?? "");
  let lastErr = "";
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(v);
      return true;
    }
  } catch (err) {
    lastErr = String(err && err.message ? err.message : err);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) {
      return true;
    }
    if (!lastErr) {
      lastErr = "execCommand(copy) returned false";
    }
    if (diagBox) {
      diagBox.dataset.copyError = lastErr || "copy blocked";
    }
    return false;
  } catch (err) {
    if (!lastErr) {
      lastErr = String(err && err.message ? err.message : err);
    }
    if (diagBox) {
      diagBox.dataset.copyError = lastErr || "copy blocked";
    }
    return false;
  }
}

function setCopyStatus(ok, detail = "") {
  if (topCopyStatus) {
    topCopyStatus.textContent = ok ? "ok" : (detail ? `failed (${detail})` : "failed");
  }
}

function copyTextToClipboardSync(text) {
  const v = String(text ?? "");
  let lastErr = "";
  try {
    const ta = document.createElement("textarea");
    ta.value = v;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) {
      return { ok: true, reason: "" };
    }
    lastErr = "execCommand(copy) returned false";
  } catch (err) {
    lastErr = String(err && err.message ? err.message : err);
  }
  if (diagBox) {
    diagBox.dataset.copyError = lastErr || "copy blocked";
  }
  return { ok: false, reason: lastErr || "copy blocked" };
}

function makeCopyButton(getText) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-icon-btn";
  btn.title = "Copy to clipboard";
  btn.textContent = "⧉";
  btn.addEventListener("click", async () => {
    const text = getText();
    const ok = await copyTextToClipboard(text);
    const prev = btn.textContent;
    btn.textContent = ok ? "✓" : "!";
    setTimeout(() => {
      btn.textContent = prev;
    }, 900);
  });
  return btn;
}

function initPanelCopyButtons() {
  const usefulValueIds = new Set([
    "statPos",
    "statClock",
    "statDate",
    "statTile",
    "statRenderParity",
    "statSource",
    "statHash",
    "statLoopHealth",
    "statReplay",
    "statCenterTiles",
    "statNetSession"
  ]);
  const rows = document.querySelectorAll(".stat-row");
  for (const row of rows) {
    const label = row.querySelector("span");
    const value = row.querySelector("strong");
    if (!label || !value) {
      continue;
    }
    const valueId = value.id || "";
    const existingBtn = row.querySelector(".copy-icon-btn");
    if (!usefulValueIds.has(valueId)) {
      if (existingBtn) {
        existingBtn.remove();
      }
      continue;
    }
    if (existingBtn) {
      continue;
    }
    const btn = makeCopyButton(() => `${label.textContent || ""}: ${value.textContent || ""}`);
    row.appendChild(btn);
  }

  if (diagBox && diagBox.parentElement && !diagBox.parentElement.querySelector(".diag-copy")) {
    const wrap = document.createElement("div");
    wrap.className = "mt-1 flex justify-end diag-copy";
    const btn = makeCopyButton(() => diagBox.textContent || "");
    wrap.appendChild(btn);
    diagBox.parentElement.insertBefore(wrap, diagBox.nextSibling);
  }
}

function updateNetSessionStat() {
  renderNetSessionStatRuntime(statNetSession, {
    token: state.net.token,
    userId: state.net.userId,
    username: state.net.username,
    characterName: state.net.characterName
  });
  updateIntroPhaseUi();
}

function updatePauseLoopUi() {
  const paused = !!state.simPaused;
  if (pauseLoopButton) {
    pauseLoopButton.textContent = paused ? "Resume Loop" : "Pause Loop";
  }
  if (statSimLoop) {
    statSimLoop.textContent = paused ? "paused" : "running";
  }
}

function setSimPaused(paused, reason = "") {
  state.simPaused = !!paused;
  state.net.backgroundSyncPaused = !!paused;
  state.accMs = 0;
  state.lastTs = performance.now();
  updatePauseLoopUi();
  if (reason) {
    diagBox.className = "diag ok";
    diagBox.textContent = reason;
  }
}

function updateIntroPhaseUi() {
  const phase = String(state.net.introPhase || "post_intro").trim().toLowerCase();
  const normalized = phase === "pre_intro" ? "pre_intro" : "post_intro";
  state.net.introPhase = normalized;
  if (statIntroPhase) {
    statIntroPhase.textContent = normalized;
  }
  if (netIntroPhaseSelect) {
    netIntroPhaseSelect.value = normalized;
  }
}

function updateNetAuthButton() {
  renderNetAuthButtonRuntime(netLoginButton, isNetAuthenticated());
}

function setNetStatus(level, text) {
  applyNetStatusRuntime({
    stateNet: state.net,
    level,
    text,
    isAuthenticated: isNetAuthenticated(),
    topNetStatus,
    topNetIndicator,
    netQuickStatus,
    netLoginButton
  });
}

let netActivityPulseTimer = 0;
function pulseNetIndicator() {
  pulseNetIndicatorRuntime({
    indicator: topNetIndicator,
    currentTimer: netActivityPulseTimer,
    timeoutMs: NET_ACTIVITY_PULSE_MS,
    setTimer: (nextTimer) => {
      netActivityPulseTimer = nextTimer | 0;
    }
  });
}

function upsertNetProfileFromInputs() {
  upsertNetProfileFromControlsRuntime({
    controls: currentNetProfileControls(),
    ...NET_PROFILE_STORAGE,
    accountSelect: netAccountSelect,
    maxEntries: 12
  });
}

function recordBackgroundNetFailure(err, context) {
  recordBackgroundFailureRuntime(state.net, {
    err,
    context,
    nowMs: Date.now(),
    windowMs: NET_BACKGROUND_FAIL_WINDOW_MS,
    maxFailures: NET_BACKGROUND_FAIL_MAX,
    setStatus: setNetStatus
  });
}

function currentNetProfileControls() {
  return {
    apiBaseInput: netApiBaseInput,
    usernameInput: netUsernameInput,
    passwordInput: netPasswordInput,
    characterNameInput: netCharacterNameInput,
    emailInput: netEmailInput
  };
}

function applyProfileToNetControls(profile) {
  return applyNetProfileToControlsRuntime({
    profile,
    controls: currentNetProfileControls(),
    selectedKeyStorageKey: NET_PROFILE_STORAGE.selectedKeyStorageKey
  });
}

function refreshNetAccountSelect() {
  return populateNetAccountSelectRuntime({ accountSelect: netAccountSelect, ...NET_PROFILE_STORAGE });
}

function netAccountSelectionBinding() {
  return {
    accountSelect: netAccountSelect,
    loadProfiles: () => loadNetProfilesFromStorage(NET_PROFILE_STORAGE.storageKey),
    profileKey: profileKeyRuntime,
    applyProfile: (profile) => {
      applyProfileToNetControls(profile);
    }
  };
}

function resetBackgroundFailures() {
  resetBackgroundFailureState(state.net);
}

function updateCriticalRecoveryStat() {
  if (!statCriticalRecoveries) {
    return;
  }
  const suffix = state.net.lastMaintenanceTick >= 0 ? ` @${state.net.lastMaintenanceTick}` : "";
  statCriticalRecoveries.textContent = `${state.net.recoveryEventCount}${suffix}`;
}

async function netRequest(route, init = {}, auth = true) {
  const enabledExtensions = runtimeExtensionsSummary(state.runtimeExtensions);
  return performManagedNetRequest({
    apiBase: String(state.net.apiBase || ""),
    route: String(route || ""),
    init,
    auth,
    token: String(state.net.token || ""),
    runtimeProfile: String(state.runtimeProfile || RUNTIME_PROFILE_CANONICAL_STRICT),
    runtimeExtensions: enabledExtensions,
    onPulse: pulseNetIndicator,
    onUnauthorized: () => {
      clearNetSessionState(state.net);
      state.net.introPhase = "post_intro";
      updateNetSessionStat();
      setNetStatus("idle", "Session expired. Please log in.");
    }
  });
}

async function netGetIntroPhase() {
  const { out, phase } = await requestIntroPhaseRuntime(state.net.introPhase, netRequest);
  state.net.introPhase = phase;
  updateIntroPhaseUi();
  return out;
}

async function netSetIntroPhase(phase) {
  const { out, phase: next } = await setIntroPhaseRuntime(phase, netRequest);
  state.net.introPhase = next;
  updateIntroPhaseUi();
  return out;
}

async function netEnsureCharacter() {
  const out = await performNetEnsureCharacter(
    String(netCharacterNameInput?.value || "Avatar"),
    netRequest
  );
  state.net.characterId = out.characterId;
  state.net.characterName = out.characterName;
}

function netSnapshotRoute() {
  const characterId = String(state.net.characterId || "").trim();
  return characterId ? `/api/characters/${characterId}/snapshot` : "/api/world/snapshot";
}

async function netLogin() {
  const out = await performNetLoginFlow({
    apiBaseInput: String(netApiBaseInput?.value || ""),
    usernameInput: String(netUsernameInput?.value || ""),
    passwordInput: String(netPasswordInput?.value || "")
  }, {
    setStatus: setNetStatus,
    setBackgroundSyncPaused: (paused) => {
      state.net.backgroundSyncPaused = !!paused;
    },
    setApiBase: (apiBase) => {
      state.net.apiBase = String(apiBase || "");
    },
    request: netRequest,
    applyLogin: (login, username) => {
      applyNetLoginState(state.net, login, username);
    },
    ensureCharacter: netEnsureCharacter,
    snapshotRoute: netSnapshotRoute,
    decodeSnapshot: decodeSimSnapshotBase64Runtime,
    applyLoadedSim: (loaded) => {
      state.sim = toAppSimStateRuntime(loaded, state.partyMembers.length);
      state.queue = [];
      state.commandLog = [];
      state.accMs = 0;
      state.lastMoveQueueAtMs = -1;
      state.avatarLastMoveTick = -1;
      state.avatarWalkAnimUntilMs = -1;
      state.interactionProbeTile = null;
    },
    pollWorldClock: netPollWorldClock,
    pollPresence: netPollPresence,
    setResumeFromSnapshot: (resumed) => {
      state.net.resumeFromSnapshot = !!resumed;
    },
    resetBackgroundFailures,
    updateSessionStat: updateNetSessionStat,
    getUsername: () => String(state.net.username || ""),
    getCharacterName: () => String(state.net.characterName || ""),
    getEmail: () => String(state.net.email || ""),
    syncEmailInput: () => {
      if (netEmailInput && state.net.email) {
        netEmailInput.value = state.net.email;
      }
    },
    persistLoginSettings: ({ apiBase, username, characterName, email }) => {
      persistNetLoginSettings({
        apiBase: NET_API_BASE_KEY,
        username: NET_USERNAME_KEY,
        characterName: NET_CHARACTER_NAME_KEY,
        email: NET_EMAIL_KEY
      }, {
        apiBase: String(apiBase || ""),
        username: String(username || ""),
        characterName: String(characterName || ""),
        email: String(email || "")
      });
    },
    onProfileUpdated: upsertNetProfileFromInputs
  });
  try {
    await netGetIntroPhase();
  } catch (_err) {
    // Clock sync will refresh intro phase shortly even if this fetch fails.
  }
  return out;
}

async function netSetEmail() {
  return performNetSetEmail(String(netEmailInput?.value || ""), {
    ensureAuth: netLogin,
    isAuthenticated: () => !!state.net.token,
    request: netRequest,
    setStatus: setNetStatus,
    applyEmail: (email, verified) => {
      state.net.email = String(email || "");
      state.net.emailVerified = !!verified;
    },
    persistEmail: (email) => {
      try {
        localStorage.setItem(NET_EMAIL_KEY, String(email || ""));
      } catch (_err) {
        // ignore storage failures
      }
    },
    onProfileUpdated: upsertNetProfileFromInputs
  });
}

async function netSendEmailVerification() {
  return performNetSendEmailVerification({
    ensureAuth: netLogin,
    isAuthenticated: () => !!state.net.token,
    request: netRequest,
    setStatus: setNetStatus
  });
}

async function netVerifyEmail() {
  return performNetVerifyEmail(String(netEmailCodeInput?.value || ""), {
    ensureAuth: netLogin,
    isAuthenticated: () => !!state.net.token,
    request: netRequest,
    setStatus: setNetStatus,
    currentEmail: () => String(state.net.email || ""),
    applyEmail: (email, verified) => {
      state.net.email = String(email || "");
      state.net.emailVerified = !!verified;
    },
    onVerified: (email) => {
      if (netEmailInput && email) {
        netEmailInput.value = email;
      }
    }
  });
}

async function netRecoverPassword() {
  return performNetRecoverPassword(
    String(netApiBaseInput?.value || ""),
    String(netUsernameInput?.value || ""),
    String(netEmailInput?.value || ""),
    {
      request: netRequest,
      setApiBase: (base) => { state.net.apiBase = String(base || ""); },
      setStatus: setNetStatus
    }
  );
}

async function netChangePassword() {
  return performNetChangePassword(
    String(netPasswordInput?.value || ""),
    String(netNewPasswordInput?.value || ""),
    {
      ensureAuth: netLogin,
      isAuthenticated: () => !!state.net.token,
      request: netRequest,
      setStatus: setNetStatus,
      onPasswordChanged: (nextPassword) => {
        if (netPasswordInput) {
          netPasswordInput.value = nextPassword;
        }
        if (netNewPasswordInput) {
          netNewPasswordInput.value = "";
        }
      },
      persistPassword: (nextPassword) => {
        try {
          localStorage.setItem(NET_PASSWORD_KEY, nextPassword);
        } catch (_err) {
          // ignore storage failures
        }
      },
      onProfileUpdated: upsertNetProfileFromInputs
    }
  );
}

function netLogout() {
  void netLogoutAndPersist();
}

async function netLogoutAndPersist() {
  const { saveErr, leaveErr } = await performNetLogoutSequence({
    hasSession: () => !!(state.net.token && state.net.userId),
    saveSnapshot: netSaveSnapshot,
    leavePresence: netLeavePresence
  });
  clearNetSessionState(state.net);
  state.net.introPhase = "post_intro";
  if (state.sessionStarted) {
    returnToTitleMenu({ saveRemote: false });
  } else {
    setStartupMenuIndex(0);
  }
  updateNetSessionStat();
  setNetStatus("idle", "Not logged in.");
  if (saveErr || leaveErr) {
    diagBox.className = "diag warn";
    const parts = [];
    if (saveErr) {
      parts.push(`position save failed: ${errorMessageRuntime(saveErr)}`);
    }
    if (leaveErr) {
      parts.push(`presence cleanup failed: ${errorMessageRuntime(leaveErr)}`);
    }
    diagBox.textContent = `Logged out with warnings (${parts.join("; ")}).`;
  } else {
    diagBox.className = "diag ok";
    diagBox.textContent = "Logged out. Position saved and presence cleared.";
  }
  updateNetAuthButton();
}

async function netSaveSnapshot() {
  return performNetSaveSnapshot({
    ensureAuth: netLogin,
    isAuthenticated: () => !!state.net.token,
    request: netRequest,
    snapshotRoute: netSnapshotRoute,
    encodeSnapshot: () => encodeSimSnapshotBase64Runtime(state.sim),
    currentTick: () => state.sim.tick >>> 0,
    onSavedTick: (tick) => {
      state.net.lastSavedTick = Number(tick) >>> 0;
    },
    resetBackgroundFailures,
    setStatus: setNetStatus
  });
}

async function netLoadSnapshot() {
  return performNetLoadSnapshot({
    ensureAuth: netLogin,
    isAuthenticated: () => !!state.net.token,
    request: netRequest,
    snapshotRoute: netSnapshotRoute,
    decodeSnapshot: decodeSimSnapshotBase64Runtime,
    applyLoadedSim: (loaded) => {
      state.sim = toAppSimStateRuntime(loaded, state.partyMembers.length);
      state.queue = [];
      state.commandLog = [];
      state.accMs = 0;
      state.lastMoveQueueAtMs = -1;
      state.avatarLastMoveTick = -1;
      state.avatarWalkAnimUntilMs = -1;
      state.interactionProbeTile = null;
    },
    resetBackgroundFailures,
    setStatus: setNetStatus
  });
}

function collectWorldItemsForMaintenance() {
  return collectWorldItemsForMaintenanceFromLayer(state.objectLayer);
}

async function netRunCriticalMaintenance(opts: { silent?: boolean } = {}) {
  return runCriticalMaintenanceRuntime(state.net, opts, {
    currentTick: () => state.sim.tick >>> 0,
    collectWorldItems: collectWorldItemsForMaintenance,
    login: netLogin,
    request: netRequest,
    resetBackgroundFailures,
    updateCriticalRecoveryStat,
    setStatus: setNetStatus,
    setDiag: (kind, text) => {
      diagBox.className = kind === "ok" ? "diag ok" : "diag warn";
      diagBox.textContent = text;
    }
  });
}

async function netFetchWorldObjectsAtCell(x, y, z) {
  if (!isNetAuthenticated()) {
    return null;
  }
  return requestWorldObjectsAtCell(x, y, z, netRequest);
}

async function netSendPresenceHeartbeat() {
  await performPresenceHeartbeat({
    session_id: state.net.sessionId,
    character_name: state.net.characterName || "Avatar",
    map_x: state.sim.world.map_x | 0,
    map_y: state.sim.world.map_y | 0,
    map_z: state.sim.world.map_z | 0,
    facing_dx: state.avatarFacingDx | 0,
    facing_dy: state.avatarFacingDy | 0,
    tick: state.sim.tick >>> 0,
    mode: state.movementMode
  }, {
    isAuthenticated: isNetAuthenticated,
    isSessionStarted: () => state.sessionStarted,
    request: netRequest,
    resetBackgroundFailures
  });
}

async function netLeavePresence() {
  await performPresenceLeave(state.net.sessionId, {
    isAuthenticated: isNetAuthenticated,
    request: netRequest,
    resetBackgroundFailures
  });
}

async function netPollPresence() {
  await performPresencePoll({
    isAuthenticated: isNetAuthenticated,
    request: netRequest,
    resetBackgroundFailures,
    isPollInFlight: () => state.net.presencePollInFlight,
    setPollInFlight: (inFlight) => {
      state.net.presencePollInFlight = !!inFlight;
    },
    setRemotePlayers: (players) => {
      state.net.remotePlayers = Array.isArray(players) ? players : [];
    },
    selfIdentity: () => ({
      sessionId: state.net.sessionId,
      userId: state.net.userId,
      username: state.net.username
    })
  });
}

function applyAuthoritativeNpcStates(rows) {
  if (!state.entityLayer || !Array.isArray(state.entityLayer.entries)) {
    return;
  }
  const nowMs = performance.now();
  const authoritativeRows = Array.isArray(rows) ? rows : [];
  const byId = new Map(authoritativeRows.map((row) => [Number(row?.npc_id) | 0, row]));
  for (const e of state.entityLayer.entries) {
    const row = byId.get(Number(e.id) | 0);
    if (!row) {
      continue;
    }
    const nextX = Number(row.x) | 0;
    const nextY = Number(row.y) | 0;
    const nextZ = Number(row.z) | 0;
    const hadAuthoritativePosition = Number.isFinite(e.authoritativeLastX)
      && Number.isFinite(e.authoritativeLastY)
      && Number.isFinite(e.authoritativeLastZ);
    const moved = hadAuthoritativePosition
      && ((e.authoritativeLastX | 0) !== nextX || (e.authoritativeLastY | 0) !== nextY || (e.authoritativeLastZ | 0) !== nextZ);
    e.x = nextX;
    e.y = nextY;
    e.z = nextZ;
    e.homeX = e.x;
    e.homeY = e.y;
    e.authoritative = true;
    e.authoritativeLastX = nextX;
    e.authoritativeLastY = nextY;
    e.authoritativeLastZ = nextZ;
    e.authoritativeUpdatedAtMs = nowMs;
    if (moved || !Number.isFinite(e.authoritativeMovedAtMs)) {
      e.authoritativeMovedAtMs = nowMs;
    }
    e.movable = false;
    e.authoritativeAction = Number(row.action) & 0xff;
    e.authoritativeMode = Number(row.mode ?? row.action) & 0xff;
    e.authoritativeDirection = Number(row.direction ?? 4) & 0x07;
    e.authoritativePose = String(row.pose || "").trim().toLowerCase();
    e.authoritativePathStatus = String(row.path_status || "").trim().toLowerCase();
    e.authoritativeScheduleIndex = Number(row.schedule_index) | 0;
  }
}

function applyAuthoritativeNpcOverrides(overrides) {
  applyAuthoritativeNpcStates(overrides);
}

function applyAuthoritativeWorldClock(clock) {
  applyAuthoritativeWorldClockToSim(clock, (next) => {
    state.sim.tick = next.tick;
    const w = state.sim.world;
    w.time_m = next.time_m;
    w.time_h = next.time_h;
    w.date_d = next.date_d;
    w.date_m = next.date_m;
    w.date_y = next.date_y;
  });
  state.net.introPhase = String(clock?.intro_state?.phase || state.net.introPhase || "post_intro");
  updateIntroPhaseUi();
  applyAuthoritativeNpcStates(Array.isArray(clock?.npc_states) ? clock.npc_states : clock?.npc_overrides);
}

async function netPollWorldClock() {
  await performWorldClockPoll({
    isAuthenticated: isNetAuthenticated,
    request: netRequest,
    resetBackgroundFailures,
    isPollInFlight: () => state.net.clockPollInFlight,
    setPollInFlight: (inFlight) => {
      state.net.clockPollInFlight = !!inFlight;
    },
    applyClock: applyAuthoritativeWorldClock
  });
}

function startAuthoritativeConversationFromPayload(payload, actor, tileId) {
  const sessionId = String(payload?.session_id || "").trim();
  const targetName = sanitizeLegacyHudLabelText(String(payload?.target_name || canonicalTalkSpeakerForTile(tileId) || "Unknown")) || "Unknown";
  const desc = sanitizeLegacyHudLabelText(String(payload?.desc || "").trim() || targetName);
  const openingLines = Array.isArray(payload?.opening_lines)
    ? payload.opening_lines.map((line) => String(line || "").trim()).filter(Boolean)
    : [];
  state.legacyConversationPrevStatus = Number(state.legacyStatusDisplay) | 0;
  state.legacyStatusDisplay = LEGACY_STATUS_DISPLAY.CMD_9E;
  state.legacyConversationActive = true;
  state.legacyConversationAuthoritative = true;
  state.legacyConversationSessionId = sessionId;
  state.legacyConversationInput = "";
  state.legacyConversationTargetName = targetName;
  state.legacyConversationActorEntityId = Number(actor?.id) | 0;
  state.legacyConversationPortraitTile = tileId;
  state.legacyConversationTargetObjNum = Number(payload?.npc_id) | 0;
  state.legacyConversationTargetObjType = Number(actor?.type) | 0;
  state.legacyConversationNpcKey = "";
  state.legacyConversationPendingPrompt = "";
  state.legacyConversationScript = null;
  state.legacyConversationDescText = desc;
  state.legacyConversationRules = [];
  state.legacyConversationPc = Number(payload?.next_pc) | 0;
  state.legacyConversationInputOpcode = Number(payload?.stop_opcode) | 0;
  state.legacyConversationVmContext = null;
  const equipSlots = legacyEquipmentSlotsForTalkActor(actor);
  state.legacyConversationShowInventory = equipSlots.length > 0;
  state.legacyConversationEquipmentSlots = equipSlots;
  const openingBlock = [formatYouSeeLine(desc || targetName)];
  if (openingLines.length > 0) {
    openingBlock.push("");
    for (const line of openingLines) {
      openingBlock.push(String(line || ""));
    }
    openingBlock.push("");
  }
  const pagedOpening = startLegacyConversationPagination(openingBlock);
  if (!pagedOpening) {
    for (const line of openingBlock) {
      pushLedgerMessage(line);
    }
    pushLegacyConversationPrompt();
  }
}

async function netStartConversation(actor, tx, ty, tz) {
  const tileId = ((Number(actor?.baseTile) | 0) + (Number(actor?.frame) | 0)) & 0xffff;
  const out = await netRequest("/api/world/objects/interact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      verb: "talk",
      npc_id: Number(actor?.id) | 0,
      actor_id: String(state.net.characterId || state.net.userId || "Avatar"),
      actor_x: state.sim.world.map_x | 0,
      actor_y: state.sim.world.map_y | 0,
      actor_z: state.sim.world.map_z | 0,
      player_name: String(state.net.characterName || "Avatar")
    })
  }, true);
  startAuthoritativeConversationFromPayload(out?.conversation_session || {}, actor, tileId);
  diagBox.className = "diag ok";
  diagBox.textContent = `Talk: ${String(out?.conversation_session?.target_name || "NPC")} (authoritative) at ${tx},${ty},${tz}.`;
}

async function netReplyConversation(typed) {
  const out = await netRequest("/api/world/conversation/respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      session_id: String(state.legacyConversationSessionId || ""),
      typed: String(typed || "")
    })
  }, true);
  return out;
}

function setAccountModalOpen(open) {
  setModalOpenRuntime(netAccountModal, !!open);
}

function initNetPanel() {
  const prefs = loadNetPanelPrefs({
    apiBase: NET_API_BASE_KEY,
    username: NET_USERNAME_KEY,
    password: NET_PASSWORD_KEY,
    email: NET_EMAIL_KEY,
    passwordVisible: NET_PASSWORD_VISIBLE_KEY,
    characterName: NET_CHARACTER_NAME_KEY,
    maintenance: NET_MAINTENANCE_KEY,
    autoLogin: NET_AUTO_LOGIN_KEY
  }, {
    apiBase: "http://127.0.0.1:8081",
    username: "avatar",
    password: "quest123",
    email: "",
    passwordVisible: "off",
    characterName: "Avatar",
    maintenance: "off",
    autoLogin: "off"
  });
  applyNetPanelPrefsToControlsRuntime(prefs, {
    apiBaseInput: netApiBaseInput,
    usernameInput: netUsernameInput,
    passwordInput: netPasswordInput,
    passwordToggleButton: netPasswordToggleButton,
    emailInput: netEmailInput,
    characterNameInput: netCharacterNameInput,
    autoLoginCheckbox: netAutoLoginCheckbox
  });
  const accountBinding = netAccountSelectionBinding();
  refreshNetAccountSelect();
  applySelectedAccountProfileRuntime(accountBinding);
  state.net.apiBase = prefs.apiBase;
  state.net.username = prefs.username;
  state.net.email = prefs.email;
  state.net.characterName = prefs.characterName;
  setNetStatus("idle", "Not logged in.");

  bindAccountProfileSelectionRuntime(accountBinding);
  state.net.maintenanceAuto = prefs.maintenance === "on";
  if (netMaintenanceToggle) {
    netMaintenanceToggle.value = state.net.maintenanceAuto ? "on" : "off";
  }
  bindNetPanelPrefPersistenceRuntime({
    controls: {
      apiBaseInput: netApiBaseInput,
      usernameInput: netUsernameInput,
      passwordInput: netPasswordInput,
      passwordToggleButton: netPasswordToggleButton,
      emailInput: netEmailInput,
      characterNameInput: netCharacterNameInput,
      autoLoginCheckbox: netAutoLoginCheckbox,
      maintenanceToggle: netMaintenanceToggle
    },
    keys: {
      apiBase: NET_API_BASE_KEY,
      username: NET_USERNAME_KEY,
      password: NET_PASSWORD_KEY,
      email: NET_EMAIL_KEY,
      passwordVisible: NET_PASSWORD_VISIBLE_KEY,
      characterName: NET_CHARACTER_NAME_KEY,
      autoLogin: NET_AUTO_LOGIN_KEY,
      maintenance: NET_MAINTENANCE_KEY
    },
    isAuthenticated: isNetAuthenticated,
    setStatus: setNetStatus,
    setMaintenanceAuto: (enabled) => {
      state.net.maintenanceAuto = !!enabled;
    }
  });
  updateNetSessionStat();
  updateCriticalRecoveryStat();
  updateNetAuthButton();
  updateIntroPhaseUi();
  updatePauseLoopUi();
  updateAudioMuteUi();
  if (netAccountOpenButton) {
    netAccountOpenButton.addEventListener("click", () => {
      refreshNetAccountSelect();
      setAccountModalOpen(true);
    });
  }
  if (netAccountCloseButton) {
    netAccountCloseButton.addEventListener("click", () => setAccountModalOpen(false));
  }
  if (netAccountModalBackdrop) {
    netAccountModalBackdrop.addEventListener("click", () => setAccountModalOpen(false));
  }

  if (netLoginButton) {
    netLoginButton.addEventListener("click", async () => {
      if (isNetAuthenticated()) {
        netLogout();
        return;
      }
      try {
        await netLogin();
        setAccountModalOpen(false);
        diagBox.className = "diag ok";
        diagBox.textContent = `Net login ok: ${state.net.username}/${state.net.characterName}`;
      } catch (err) {
        setNetStatus("error", `Login failed: ${errorMessageRuntime(err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Net login failed: ${errorMessageRuntime(err)}`;
      }
    });
  }
  if (prefs.autoLogin === "on" && !isNetAuthenticated()) {
    (async () => {
      try {
        setNetStatus("connecting", "Auto-login...");
        await netLogin();
        setAccountModalOpen(false);
        diagBox.className = "diag ok";
        diagBox.textContent = `Auto-login ok: ${state.net.username}/${state.net.characterName}`;
      } catch (err) {
        setNetStatus("error", `Auto-login failed: ${errorMessageRuntime(err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Auto-login failed: ${errorMessageRuntime(err)}`;
      }
    })();
  }
  if (netRecoverButton) {
    netRecoverButton.addEventListener("click", async () => {
      await runNetPanelActionRuntime({
        run: netRecoverPassword,
        setStatus: setNetStatus,
        setDiag: (kind, text) => {
          diagBox.className = kind === "ok" ? "diag ok" : "diag warn";
          diagBox.textContent = text;
        },
        okText: (out) => `Recovery email sent for ${out?.user?.username || "user"}.`,
        errorStatusPrefix: "Recovery failed",
        errorDiagPrefix: "Password recovery failed"
      });
    });
  }
  if (netSetEmailButton) {
    netSetEmailButton.addEventListener("click", async () => {
      await runNetPanelActionRuntime({
        run: netSetEmail,
        setStatus: setNetStatus,
        setDiag: (kind, text) => {
          diagBox.className = kind === "ok" ? "diag ok" : "diag warn";
          diagBox.textContent = text;
        },
        okText: (out) => {
          const verified = !!out?.user?.email_verified;
          return verified
            ? `Recovery email set and verified (${out?.user?.email || ""}).`
            : `Recovery email set (${out?.user?.email || ""}). Verification required.`;
        },
        errorStatusPrefix: "Set email failed",
        errorDiagPrefix: "Set email failed"
      });
    });
  }
  if (netSendVerifyButton) {
    netSendVerifyButton.addEventListener("click", async () => {
      await runNetPanelActionRuntime({
        run: netSendEmailVerification,
        setStatus: setNetStatus,
        setDiag: (kind, text) => {
          diagBox.className = kind === "ok" ? "diag ok" : "diag warn";
          diagBox.textContent = text;
        },
        okText: "Verification code sent to recovery email.",
        errorStatusPrefix: "Send code failed",
        errorDiagPrefix: "Send code failed"
      });
    });
  }
  if (netVerifyEmailButton) {
    netVerifyEmailButton.addEventListener("click", async () => {
      await runNetPanelActionRuntime({
        run: netVerifyEmail,
        setStatus: setNetStatus,
        setDiag: (kind, text) => {
          diagBox.className = kind === "ok" ? "diag ok" : "diag warn";
          diagBox.textContent = text;
        },
        okText: "Recovery email verified.",
        errorStatusPrefix: "Verify email failed",
        errorDiagPrefix: "Verify email failed"
      });
    });
  }
  if (netChangePasswordButton) {
    netChangePasswordButton.addEventListener("click", async () => {
      await runNetPanelActionRuntime({
        run: netChangePassword,
        setStatus: setNetStatus,
        setDiag: (kind, text) => {
          diagBox.className = kind === "ok" ? "diag ok" : "diag warn";
          diagBox.textContent = text;
        },
        okText: "Account password updated.",
        errorStatusPrefix: "Change password failed",
        errorDiagPrefix: "Change password failed"
      });
    });
  }
  if (netSaveButton) {
    netSaveButton.addEventListener("click", async () => {
      try {
        await netSaveSnapshot();
        updateNetSessionStat();
        diagBox.className = "diag ok";
        diagBox.textContent = `Remote snapshot saved at tick ${state.sim.tick >>> 0}.`;
      } catch (err) {
        setNetStatus("error", `Save failed: ${errorMessageRuntime(err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Remote save failed: ${errorMessageRuntime(err)}`;
      }
    });
  }
  if (netLoadButton) {
    netLoadButton.addEventListener("click", async () => {
      try {
        const out = await netLoadSnapshot();
        updateNetSessionStat();
        diagBox.className = "diag ok";
        diagBox.textContent = `Remote snapshot loaded at tick ${Number(out?.snapshot_meta?.saved_tick || 0)}.`;
      } catch (err) {
        setNetStatus("error", `Load failed: ${errorMessageRuntime(err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Remote load failed: ${errorMessageRuntime(err)}`;
      }
    });
  }
  if (netMaintenanceButton) {
    netMaintenanceButton.addEventListener("click", async () => {
      try {
        await netRunCriticalMaintenance({ silent: false });
      } catch (err) {
        setNetStatus("error", `Maintenance failed: ${errorMessageRuntime(err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Critical maintenance failed: ${errorMessageRuntime(err)}`;
      }
    });
  }
  if (pauseLoopButton) {
    pauseLoopButton.addEventListener("click", () => {
      const next = !state.simPaused;
      setSimPaused(
        next,
        next
          ? "Simulation loop paused. Background polling disabled."
          : "Simulation loop resumed. Background polling enabled."
      );
    });
  }
  if (audioMuteButton) {
    audioMuteButton.addEventListener("click", () => {
      toggleAudioMute();
    });
  }
  if (netIntroPhaseButton) {
    netIntroPhaseButton.addEventListener("click", async () => {
      try {
        if (!isNetAuthenticated()) {
          throw new Error("Login required");
        }
        const requested = String(netIntroPhaseSelect?.value || state.net.introPhase || "post_intro");
        await netSetIntroPhase(requested);
        diagBox.className = "diag ok";
        diagBox.textContent = `Intro phase set to ${String(state.net.introPhase)}.`;
        setNetStatus("online", `Intro phase: ${String(state.net.introPhase)}`);
      } catch (err) {
        setNetStatus("error", `Intro phase update failed: ${errorMessageRuntime(err)}`);
        diagBox.className = "diag warn";
        diagBox.textContent = `Intro phase update failed: ${errorMessageRuntime(err)}`;
      }
    });
  }
}

function setGrid(enabled) {
  state.showGrid = !!enabled;
  if (gridToggle) {
    gridToggle.value = state.showGrid ? "on" : "off";
  }
  try {
    localStorage.setItem(GRID_KEY, state.showGrid ? "on" : "off");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initGrid() {
  let saved = "off";
  try {
    const fromStorage = localStorage.getItem(GRID_KEY);
    if (fromStorage === "on" || fromStorage === "off") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setGrid(saved === "on");
  if (gridToggle) {
    gridToggle.addEventListener("change", () => {
      setGrid(gridToggle.value === "on");
    });
  }
}

function setOverlayDebug(enabled) {
  state.showOverlayDebug = !!enabled;
  if (debugOverlayToggle) {
    debugOverlayToggle.value = state.showOverlayDebug ? "on" : "off";
  }
  try {
    localStorage.setItem(DEBUG_OVERLAY_KEY, state.showOverlayDebug ? "on" : "off");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initOverlayDebug() {
  let saved = "off";
  try {
    const fromStorage = localStorage.getItem(DEBUG_OVERLAY_KEY);
    if (fromStorage === "on" || fromStorage === "off") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setOverlayDebug(saved === "on");
  if (debugOverlayToggle) {
    debugOverlayToggle.addEventListener("change", () => {
      setOverlayDebug(debugOverlayToggle.value === "on");
    });
  }
}

function setAnimationMode(mode) {
  const nextMode = mode === "freeze" ? "freeze" : "live";
  state.animationFrozen = nextMode === "freeze";
  if (state.animationFrozen) {
    state.frozenAnimationTick = state.sim.tick >>> 0;
  } else {
    state.frozenAnimationTick = null;
  }
  if (animationToggle) {
    animationToggle.value = nextMode;
  }
  try {
    localStorage.setItem(ANIMATION_KEY, nextMode);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initAnimationMode() {
  let saved = "live";
  try {
    const fromStorage = localStorage.getItem(ANIMATION_KEY);
    if (fromStorage === "live" || fromStorage === "freeze") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setAnimationMode(saved);
  if (animationToggle) {
    animationToggle.addEventListener("change", () => {
      setAnimationMode(animationToggle.value);
    });
  }
}

function setPaletteFxMode(enabled) {
  state.enablePaletteFx = !!enabled;
  state.paletteFrameTick = -1;
  state.paletteFrame = null;
  if (paletteFxToggle) {
    paletteFxToggle.value = state.enablePaletteFx ? "on" : "off";
  }
  try {
    localStorage.setItem(PALETTE_FX_KEY, state.enablePaletteFx ? "on" : "off");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initPaletteFxMode() {
  let saved = "on";
  try {
    const fromStorage = localStorage.getItem(PALETTE_FX_KEY);
    if (fromStorage === "on" || fromStorage === "off") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setPaletteFxMode(saved === "on");
  if (paletteFxToggle) {
    paletteFxToggle.addEventListener("change", () => {
      setPaletteFxMode(paletteFxToggle.value === "on");
    });
  }
}

function setMovementMode(mode) {
  const next = mode === "avatar" ? "avatar" : "ghost";
  state.movementMode = next;
  if (next !== "avatar") {
    state.useCursorActive = false;
    state.targetVerb = "";
  }
  if (movementModeToggle) {
    movementModeToggle.value = next;
  }
  if (statAvatarState) {
    statAvatarState.textContent = next === "avatar" ? "avatar" : "ghost";
  }
  try {
    localStorage.setItem(MOVEMENT_MODE_KEY, next);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function initMovementMode() {
  let saved = "avatar";
  try {
    const fromStorage = localStorage.getItem(MOVEMENT_MODE_KEY);
    if (fromStorage === "avatar" || fromStorage === "ghost") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setMovementMode(saved);
  if (movementModeToggle) {
    movementModeToggle.addEventListener("change", () => {
      setMovementMode(movementModeToggle.value);
    });
  }
}

function setLegacyFramePreview(enabled) {
  const on = !!enabled;
  document.documentElement.setAttribute("data-legacy-frame-preview", on ? "on" : "off");
  if (capturePreviewToggle) {
    capturePreviewToggle.value = on ? "on" : "off";
  }
  applyLegacyFrameLayout();
  try {
    localStorage.setItem(LEGACY_FRAME_PREVIEW_KEY, on ? "on" : "off");
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
}

function setLegacyScaleMode(mode) {
  const next = isLegacyScaleMode(mode) ? mode : "fit";
  state.legacyScaleMode = next;
  if (legacyScaleModeToggle) {
    legacyScaleModeToggle.value = next;
  }
  try {
    localStorage.setItem(LEGACY_SCALE_MODE_KEY, next);
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  applyLegacyFrameLayout();
}

function cycleLegacyScaleMode(step) {
  const current = isLegacyScaleMode(state.legacyScaleMode) ? state.legacyScaleMode : "fit";
  const idx = LEGACY_SCALE_MODES.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const nextIdx = (base + step + LEGACY_SCALE_MODES.length) % LEGACY_SCALE_MODES.length;
  setLegacyScaleMode(LEGACY_SCALE_MODES[nextIdx]);
}

function initLegacyScaleMode() {
  let saved = "4";
  try {
    const fromStorage = localStorage.getItem(LEGACY_SCALE_MODE_KEY);
    if (isLegacyScaleMode(fromStorage)) {
      saved = fromStorage;
    } else if (fromStorage === "native") {
      saved = "4";
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setLegacyScaleMode(saved);
  if (legacyScaleModeToggle) {
    legacyScaleModeToggle.addEventListener("change", () => {
      setLegacyScaleMode(legacyScaleModeToggle.value);
    });
  }
}

function initLegacyFramePreview() {
  let saved = "on";
  try {
    const fromStorage = localStorage.getItem(LEGACY_FRAME_PREVIEW_KEY);
    if (fromStorage === "on" || fromStorage === "off") {
      saved = fromStorage;
    }
  } catch (_err) {
    // ignore storage failures in restrictive browser contexts
  }
  setLegacyFramePreview(saved === "on");
  if (capturePreviewToggle) {
    capturePreviewToggle.addEventListener("change", () => {
      setLegacyFramePreview(capturePreviewToggle.value === "on");
    });
  }
}

function tryLookAtCell(sim, tx, ty) {
  if (!state.mapCtx) {
    return false;
  }
  const tz = sim.world.map_z | 0;
  if (!isWithinChebyshevRangeRuntime(sim.world.map_x | 0, sim.world.map_y | 0, tx | 0, ty | 0, 7)) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Look: ${tx},${ty} is out of range.`;
    pushLedgerMessage("Thou dost see nothing.");
    showLegacyLedgerPrompt();
    return false;
  }
  const obj = topWorldObjectAtCellRuntime(state.objectLayer, sim, tx, ty, tz, {}, WORLD_OBJECT_LOOKUP_DEPS);
  if (obj) {
    const tileId = ((obj.baseTile | 0) + (obj.frame | 0)) & 0xffff;
    pushLedgerMessage(canonicalLookSentenceForTile(tileId));
    showLegacyLedgerPrompt();
    diagBox.className = "diag ok";
    diagBox.textContent = `Look: ${canonicalLookSentenceForTile(tileId)} @ ${tx},${ty},${tz}`;
    return true;
  }
  const actor = nearestTalkTargetAtCellRuntime(state.entityLayer?.entries, tx, ty, tz, AVATAR_ENTITY_ID);
  if (actor) {
    const tileId = ((actor.baseTile | 0) + (actor.frame | 0)) & 0xffff;
    pushLedgerMessage(canonicalLookSentenceForTile(tileId));
    showLegacyLedgerPrompt();
    diagBox.className = "diag ok";
    diagBox.textContent = `Look: ${canonicalLookSentenceForTile(tileId)} @ ${tx},${ty},${tz}`;
    return true;
  }
  const tile = state.mapCtx.tileAt(tx | 0, ty | 0, tz | 0) & 0xffff;
  pushLedgerMessage(canonicalLookSentenceForTile(tile));
  showLegacyLedgerPrompt();
  diagBox.className = "diag ok";
  diagBox.textContent = `Look: ${canonicalLookSentenceForTile(tile)} @ ${tx},${ty},${tz}`;
  return true;
}

function tryTalkAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  if (!isWithinChebyshevRangeRuntime(sim.world.map_x | 0, sim.world.map_y | 0, tx | 0, ty | 0, 1)) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Talk: target must be adjacent (${tx},${ty}).`;
    pushLedgerMessage("No one responds.");
    showLegacyLedgerPrompt();
    return false;
  }
  const actor = nearestTalkTargetAtCellRuntime(state.entityLayer?.entries, tx, ty, tz, AVATAR_ENTITY_ID);
  if (!actor) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Talk: nobody there at ${tx},${ty},${tz}.`;
    pushLedgerMessage("No one responds.");
    showLegacyLedgerPrompt();
    return false;
  }
  if (isNetAuthenticated()) {
    diagBox.className = "diag ok";
    diagBox.textContent = `Talk: contacting authoritative conversation service for actor ${Number(actor.id) | 0}...`;
    netStartConversation(actor, tx, ty, tz).catch((err) => {
      diagBox.className = "diag warn";
      diagBox.textContent = `Talk failed: ${errorMessageRuntime(err)}`;
      pushLedgerMessage("No one responds.");
      showLegacyLedgerPrompt();
    });
    return true;
  }
  const haveConverse = (state.converseArchiveA instanceof Uint8Array) || (state.converseArchiveB instanceof Uint8Array);
  const tileId = ((actor.baseTile | 0) + (actor.frame | 0)) & 0xffff;
  const actorId = Number(actor.id) | 0;
  const resolvedConversation = resolveConversationScriptForActor(actor, tileId);
  const scriptAvailable = !!(resolvedConversation.valid && (resolvedConversation.script instanceof Uint8Array));
  const script = scriptAvailable ? resolvedConversation.script : null;
  const header = scriptAvailable
    ? resolvedConversation.header
    : { name: "", desc: "", mainPc: 0 };
  const knownName = state.legacyConversationKnownNames[String(actorId)] || "";
  const scriptName = String(header.name || "").trim();
  const speakerRaw = knownName || scriptName || canonicalTalkSpeakerForTile(tileId);
  const speaker = sanitizeLegacyHudLabelText(speakerRaw) || "Unknown";
  const fallbackHintObjNum = canonicalConversationHintIdFromSpeaker(speaker);
  const talkObjNum = (scriptAvailable
    ? (Number(resolvedConversation.objNum) | 0)
    : ((fallbackHintObjNum >= 0) ? fallbackHintObjNum : actorId));
  const fallbackDesc = String(legacyLookupTileString(tileId) || "").trim();
  const desc = sanitizeLegacyHudLabelText(String(header.desc || "").trim() || fallbackDesc);
  const rules = scriptAvailable ? parseConversationRules(script, header.mainPc) : [];
  const vmContext = conversationVmContextForSession({
    targetName: speaker,
    objNum: talkObjNum
  });
  const openingResult = scriptAvailable
    ? decodeConversationOpeningResult(script, header.mainPc, vmContext)
    : { lines: [], stopOpcode: 0, stopPc: -1, nextPc: -1 };
  const openingLinesRaw = openingResult.lines;
  const openingLines = canonicalizeOpeningLines(talkObjNum, openingLinesRaw);
  if (!scriptAvailable) {
    const summary = debugConversationResolutionSummary(actor, tileId);
    diagBox.className = "diag warn";
    diagBox.textContent = `Talk fallback: ${summary}`;
  }
  /* Canonical UI behavior: entering talk routes status panel to inspect/talk (0x9E). */
  state.legacyConversationPrevStatus = Number(state.legacyStatusDisplay) | 0;
  state.legacyStatusDisplay = LEGACY_STATUS_DISPLAY.CMD_9E;
  state.legacyConversationActive = true;
  state.legacyConversationInput = "";
  state.legacyConversationTargetName = speaker;
  state.legacyConversationActorEntityId = actorId;
  state.legacyConversationPortraitTile = tileId;
  state.legacyConversationTargetObjNum = talkObjNum;
  state.legacyConversationTargetObjType = Number(actor.type) | 0;
  state.legacyConversationNpcKey = "";
  state.legacyConversationPendingPrompt = "";
  state.legacyConversationScript = scriptAvailable ? script : null;
  state.legacyConversationDescText = desc;
  state.legacyConversationRules = rules;
  state.legacyConversationPc = scriptAvailable ? (Number(openingResult.stopPc) | 0) : -1;
  state.legacyConversationInputOpcode = scriptAvailable ? (Number(openingResult.stopOpcode) | 0) : 0;
  state.legacyConversationVmContext = vmContext;
  const equipSlots = legacyEquipmentSlotsForTalkActor(actor);
  /*
    Canonical C_27A1_02D9 path: paperdoll/inventory is shown in talk view only
    when `showInven` is true (derived from real EQUIP objects on the actor).
  */
  state.legacyConversationShowInventory = equipSlots.length > 0;
  state.legacyConversationEquipmentSlots = equipSlots;
  const openingBlock = [formatYouSeeLine(desc || speaker)];
  let pushedOpening = false;
  const normalizedOpening = (Array.isArray(openingLines) ? openingLines : [])
    .map((line) => String(line || "").trim())
    .filter(Boolean);
  if (normalizedOpening.length > 0) {
    openingBlock.push("");
  }
  for (const rawLine of normalizedOpening) {
    const line = renderConversationMacros(String(rawLine || "").trim(), vmContext);
    if (line) {
      openingBlock.push(line);
      pushedOpening = true;
    }
  }
  if (!pushedOpening) {
    const fallback = canonicalTalkFallbackGreeting(resolvedConversation.objNum, speaker, vmContext);
    if (fallback) {
      openingBlock.push(`"${fallback}"`);
    }
  }
  if (pushedOpening) {
    openingBlock.push("");
  }
  const pagedOpening = startLegacyConversationPagination(openingBlock);
  if (!pagedOpening) {
    for (const line of openingBlock) {
      pushLedgerMessage(line);
    }
  }
  if (!pagedOpening) {
    pushLegacyConversationPrompt();
  }
  diagBox.className = haveConverse ? "diag ok" : "diag warn";
  diagBox.textContent = `Talk: ${speaker} (actor id ${Number(actor.id) | 0}, conv id ${Number(resolvedConversation.objNum) | 0}, type 0x${(Number(actor.type) & 0x3ff).toString(16)}) at ${tx},${ty},${tz}; valid=${resolvedConversation.valid ? 1 : 0}; rules=${rules.length}; showInven=${state.legacyConversationShowInventory ? 1 : 0}; converse=${haveConverse ? "loaded" : "missing"}.`;
  return true;
}

function applyInventoryProjectionFromServerObjects(sim, objects) {
  if (!sim) {
    return;
  }
  sim.inventory = inventoryProjectionFromServerObjectsRuntime(objects);
}

async function netSyncInventoryProjection() {
  if (!isNetAuthenticated() || !state.sim) {
    return null;
  }
  const actorId = String(state.net.characterId || state.net.userId || "Avatar");
  const out = await netRequest(`/api/world/inventory?actor_id=${encodeURIComponent(actorId)}`, {
    method: "GET"
  }, true);
  applyInventoryProjectionFromServerObjects(state.sim, out?.objects || []);
  return out;
}

async function netTakeWorldObject(obj, tx, ty, tz) {
  const out = await requestTakeWorldObjectRuntime({
    actorId: state.net.characterId || state.net.userId || "Avatar",
    actorX: state.sim.world.map_x,
    actorY: state.sim.world.map_y,
    actorZ: state.sim.world.map_z,
    target: obj
  }, netRequest);
  const item = inventoryItemFromTakeResponseRuntime(out, obj);
  addObjectToInventoryRuntime(state.sim, item);
  markObjectRemovedRuntime(state.sim, obj);
  const invKey = inventoryKeyForObjectRuntime(item);
  const count = Number(state.sim.inventory[invKey]) >>> 0;
  diagBox.className = "diag ok";
  diagBox.textContent = `Get: picked 0x${(Number(item.type) & 0x3ff).toString(16)} at ${tx},${ty},${tz} (inv ${invKey}=${count}).`;
  return out;
}

function tryGetAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  if (!isWithinChebyshevRangeRuntime(sim.world.map_x | 0, sim.world.map_y | 0, tx | 0, ty | 0, 1)) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Get: target must be adjacent (${tx},${ty}).`;
    return false;
  }
  const obj = topWorldObjectAtCellRuntime(
    state.objectLayer,
    sim,
    tx,
    ty,
    tz,
    { pickupOnly: true },
    WORLD_OBJECT_LOOKUP_DEPS
  );
  if (!obj) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Get: nothing portable at ${tx},${ty},${tz}.`;
    return false;
  }
  if (isNetAuthenticated()) {
    diagBox.className = "diag ok";
    diagBox.textContent = `Get: taking 0x${(obj.type & 0x3ff).toString(16)} at ${tx},${ty},${tz}...`;
    void netTakeWorldObject(obj, tx, ty, tz).catch((err) => {
      diagBox.className = "diag warn";
      diagBox.textContent = `Get failed: ${errorMessageRuntime(err)}`;
    });
    return true;
  }
  addObjectToInventoryRuntime(sim, obj);
  markObjectRemovedRuntime(sim, obj);
  const invKey = inventoryKeyForObjectRuntime(obj);
  const count = Number(sim.inventory[invKey]) >>> 0;
  diagBox.className = "diag ok";
  diagBox.textContent = `Get: picked 0x${(obj.type & 0x3ff).toString(16)} at ${tx},${ty},${tz} (inv ${invKey}=${count}).`;
  return true;
}

function tryAttackAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  const actor = nearestTalkTargetAtCellRuntime(state.entityLayer?.entries, tx, ty, tz, AVATAR_ENTITY_ID);
  const result = legacyAttackVerbRuntime(actor, tx, ty, tz);
  if (result.playSfx === "attack_swing") {
    playSfx(U6_SFX.ATTACK_SWING);
  }
  diagBox.className = `diag ${result.diagClass}`;
  diagBox.textContent = result.text;
  return result.ok;
}

function tryCastAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  const result = legacyCastVerbRuntime(tx, ty, tz);
  if (result.playSfx === "casting_magic_p1") {
    playSfx(U6_SFX.CASTING_MAGIC_P1);
  }
  diagBox.className = `diag ${result.diagClass}`;
  diagBox.textContent = result.text;
  return result.ok;
}

function tryDropAtCell(sim, tx, ty) {
  const result = legacyDropVerbRuntime(sim, tx, ty);
  diagBox.className = `diag ${result.diagClass}`;
  diagBox.textContent = result.text;
  return result.ok;
}

function tryMoveVerbAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  const result = legacyMoveVerbRuntime(tx, ty, tz);
  diagBox.className = `diag ${result.diagClass}`;
  diagBox.textContent = result.text;
  return result.ok;
}

function findObjectByAnchor(anchor) {
  if (!anchor || !state.objectLayer) {
    return null;
  }
  const overlays = state.objectLayer.objectsAt(anchor.x | 0, anchor.y | 0, anchor.z | 0);
  let typeMatch = null;
  for (const o of overlays) {
    if ((o.order | 0) === (anchor.order | 0) && (o.type | 0) === (anchor.type | 0)) {
      return o;
    }
    if (!typeMatch && (o.type | 0) === (anchor.type | 0)) {
      typeMatch = o;
    }
  }
  /*
    Canonical object order can drift after assoc/overlay normalization. Keep anchor
    resolution stable by falling back to same-cell/same-type when order no longer matches.
  */
  if (typeMatch) {
    return typeMatch;
  }
  if (isChairObjectRuntime(anchor) || isBedObjectRuntime(anchor)) {
    for (const o of overlays) {
      if (isChairObjectRuntime(o) || isBedObjectRuntime(o)) {
        return o;
      }
    }
  }
  return null;
}

function objectFootprintTiles(sim, o, ox, oy) {
  const tileId = resolveDoorTileIdRuntime(sim, o) & 0xffff;
  return objectFootprintTilesRuntime(ox, oy, tileId, tileFlagsForTile);
}

function isBlockedAt(sim, wx, wy, wz) {
  if (!state.mapCtx) {
    return false;
  }
  return isBlockedAtRuntime(wx, wy, wz, {
    avatarEntityId: AVATAR_ENTITY_ID,
    entities: state.entityLayer?.entries ?? null,
    isDoorObject: isCloseableDoorObjectRuntime,
    isDoorOpen: (o) => isDoorFrameOpenRuntime(
      o?.type,
      resolvedDoorFrameRuntime(sim, o as Parameters<typeof resolvedDoorFrameRuntime>[1])
    ),
    isImplicitSolidObjectTile: (objType, tileId) => isImplicitSolidObjectTileRuntime(objType, tileId, tileFlagsForTile),
    isSolidEnvObject: isSolidEnvObjectRuntime,
    mapTileAt: (x, y, z) => state.mapCtx.tileAt(x, y, z),
    objectFootprintTiles: (o, ox, oy) => objectFootprintTiles(sim, o, ox, oy),
    objectsAt: state.objectLayer && state.tileFlags ? (x, y, z) => state.objectLayer.objectsAt(x, y, z) : null,
    terrainFlagsForTile: (tileId) => state.terrainType ? (state.terrainType[tileId & 0x07ff] ?? 0) : 0,
    tileFlagsForTile
  });
}

function tryToggleDoorInFacingDirection(sim, dx, dy) {
  if (!state.objectLayer) {
    return false;
  }
  const tx = (sim.world.map_x + dx) | 0;
  const ty = (sim.world.map_y + dy) | 0;
  const tz = sim.world.map_z | 0;
  const overlays = state.objectLayer.objectsAt(tx, ty, tz);
  for (const o of overlays) {
    if (!isCloseableDoorObjectRuntime(o)) {
      continue;
    }
    const beforeFrame = resolvedDoorFrameRuntime(sim, o);
    const beforeOpen = isDoorFrameOpenRuntime(o?.type, beforeFrame);
    toggleDoorStateRuntime(sim, o);
    const afterFrame = resolvedDoorFrameRuntime(sim, o);
    const afterOpen = isDoorFrameOpenRuntime(o?.type, afterFrame);
    diagBox.className = "diag ok";
    diagBox.textContent = doorToggleMessageRuntime({ afterOpen, beforeOpen, x: tx, y: ty, z: tz });
    return true;
  }
  return false;
}

function clearPendingAvatarMoveCommands(sim) {
  if (!Array.isArray(state.queue) || !sim) {
    return;
  }
  state.queue = filterFutureCommandsOfTypeRuntime(state.queue, sim.tick, LEGACY_COMMAND_TYPE.MOVE_AVATAR);
}

function chairFrameForCell(obj, tx, ty) {
  return chairFrameForCellRuntime(
    obj,
    tx,
    ty,
    (o) => objectFootprintTiles(state.sim, o, o.x | 0, o.y | 0)
  );
}

function objectIsChairAtCell(obj, tx, ty) {
  return objectIsChairAtCellRuntime(
    obj,
    tx,
    ty,
    tileFlagsForTile,
    (o) => objectFootprintTiles(state.sim, o, o.x | 0, o.y | 0)
  );
}

function objectIsBedAtCell(obj, tx, ty) {
  return objectIsBedAtCellRuntime(obj, tx, ty, tileFlagsForTile);
}

function furnitureAtWorldCell(sim, tx, ty, tz) {
  return furnitureAtWorldCellRuntime({
    bedInteractionScore,
    fromX: sim.world.map_x,
    fromY: sim.world.map_y,
    isBedAtCell: objectIsBedAtCell,
    isChairAtCell: objectIsChairAtCell,
    objectsAt: state.objectLayer ? (x, y, z) => state.objectLayer.objectsAt(x, y, z) : null,
    tx,
    ty,
    tz
  });
}

function furnitureAtCell(sim, tx, ty) {
  return furnitureAtWorldCell(sim, tx, ty, sim.world.map_z | 0);
}

function tryInteractFurnitureObject(sim, o) {
  const result = applyFurnitureInteractionRuntime(sim, o, {
    isBedObject: isBedObjectRuntime,
    preferredSleepCell: preferredSleepCellForBed
  });
  if (!result.ok) {
    return false;
  }
  if (result.clearPendingMoveCommands) {
    /* Prevent stale buffered movement from instantly cancelling a fresh sit/sleep pose. */
    clearPendingAvatarMoveCommands(sim);
  }
  diagBox.className = `diag ${result.diagClass}`;
  diagBox.textContent = result.text;
  return true;
}

function tryInteractFurnitureInFacingDirection(sim, dx, dy) {
  const tx = (sim.world.map_x + dx) | 0;
  const ty = (sim.world.map_y + dy) | 0;
  return tryInteractFurnitureObject(sim, furnitureAtCell(sim, tx, ty));
}

function tryToggleDoorAtCell(sim, tx, ty, tz) {
  if (!state.objectLayer) {
    return false;
  }
  const overlays = state.objectLayer.objectsAt(tx | 0, ty | 0, tz | 0);
  for (const o of overlays) {
    if (!isCloseableDoorObjectRuntime(o)) {
      continue;
    }
    const beforeFrame = resolvedDoorFrameRuntime(sim, o);
    const beforeOpen = isDoorFrameOpenRuntime(o?.type, beforeFrame);
    toggleDoorStateRuntime(sim, o);
    const afterFrame = resolvedDoorFrameRuntime(sim, o);
    const afterOpen = isDoorFrameOpenRuntime(o?.type, afterFrame);
    diagBox.className = "diag ok";
    diagBox.textContent = doorToggleMessageRuntime({ afterOpen, beforeOpen, x: tx, y: ty, z: tz });
    return true;
  }
  return false;
}

function tryInteractAtCell(sim, tx, ty) {
  const tz = sim.world.map_z | 0;
  if (state.objectLayer) {
    const overlays = state.objectLayer.objectsAt(tx | 0, ty | 0, tz | 0);
    const obj = overlays.find((o) => {
      const type = (Number(o?.type) | 0) & 0x3ff;
      return type === OBJ_U6_BELL || type === OBJ_U6_RUBBER_DUCKY;
    });
    if (obj) {
      const type = (Number(obj.type) | 0) & 0x3ff;
      playSfx(type === OBJ_U6_BELL ? U6_SFX.BELL : U6_SFX.RUBBER_DUCK);
    }
  }
  if (tryToggleDoorAtCell(sim, tx, ty, tz)) {
    return true;
  }
  return tryInteractFurnitureObject(sim, furnitureAtCell(sim, tx, ty));
}

function tryInteractFacing(sim, dx, dy) {
  const tx = (sim.world.map_x + dx) | 0;
  const ty = (sim.world.map_y + dy) | 0;
  if (tryInteractAtCell(sim, tx, ty)) {
    return true;
  }
  return false;
}

function initCapturePresets() {
  if (!locationSelect) {
    return;
  }
  locationSelect.innerHTML = "";
  for (const p of CAPTURE_PRESETS) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    locationSelect.appendChild(opt);
  }
}

function activeCapturePreset() {
  const id = locationSelect ? locationSelect.value : "";
  return CAPTURE_PRESETS.find((p) => p.id === id) ?? CAPTURE_PRESETS[0];
}

function setStartupMenuIndex(nextIndex) {
  const idx = normalizeStartupMenuIndexRuntime(nextIndex, STARTUP_MENU.length);
  if (state.startupMenuIndex !== idx) {
    state.startupCanvasCache.clear();
  }
  state.startupMenuIndex = idx;
}

function isNetAuthenticated() {
  return !!(state.net && state.net.token && state.net.userId);
}

function activateStartupMenuSelection() {
  if (!STARTUP_MENU.length) {
    return;
  }
  const selected = STARTUP_MENU[state.startupMenuIndex] || STARTUP_MENU[0];
  if (!selected || !startupMenuItemEnabledRuntime(selected, isNetAuthenticated())) {
    if (selected && selected.id === "journey" && !isNetAuthenticated()) {
      setNetStatus("idle", "Login required before Journey Onward.");
      diagBox.className = "diag warn";
      diagBox.textContent = "Login required before Journey Onward.";
      return;
    }
    diagBox.className = "diag warn";
    diagBox.textContent = `"${selected ? selected.label : "This option"}" is not available in this build.`;
    return;
  }
  if (selected.id === "journey") {
    startSessionFromTitle();
  }
}

function placeCameraAtPresetId(presetId) {
  const p = CAPTURE_PRESETS.find((v) => v.id === presetId) ?? CAPTURE_PRESETS[0];
  if (!p) {
    return;
  }
  state.queue.length = 0;
  state.sim.world.map_x = p.x | 0;
  state.sim.world.map_y = p.y | 0;
  state.sim.world.map_z = p.z | 0;
  if (locationSelect) {
    locationSelect.value = p.id;
  }
}

function startSessionFromTitle() {
  if (state.sessionStarted) {
    return;
  }
  if (!isNetAuthenticated()) {
    setNetStatus("idle", "Login required before Journey Onward.");
    diagBox.className = "diag warn";
    diagBox.textContent = "Login required before Journey Onward.";
    return;
  }
  if (!state.runtimeReady) {
    diagBox.className = "diag warn";
    diagBox.textContent = "Runtime assets are still loading.";
    return;
  }
  if (!state.net.resumeFromSnapshot) {
    placeCameraAtPresetId("avatar_start");
  }
  state.accMs = 0;
  state.lastTs = performance.now();
  state.loopHealth.lastDtMs = 0;
  state.loopHealth.maxDtMs = 0;
  state.queue.length = 0;
  state.sessionStarted = true;
  if (state.audio) {
    state.audio.stopMusic();
    state.musicPhase = "";
    state.musicSong = "";
  }
  endLegacyConversation();
  state.legacyLedgerLines.length = 0;
  pushLedgerMessage(`${String(state.net.characterName || "Avatar")}:`);
  showLegacyLedgerPrompt();
  const resumed = !!state.net.resumeFromSnapshot;
  state.net.resumeFromSnapshot = false;
  diagBox.className = "diag ok";
  diagBox.textContent = resumed
    ? "Journey Onward: resumed at last saved position."
    : "Journey Onward: loaded at the legacy avatar start position.";
  void netSyncInventoryProjection().catch((err) => {
    diagBox.className = "diag warn";
    diagBox.textContent = `Inventory sync failed: ${errorMessageRuntime(err)}`;
  });
}

function returnToTitleMenu(opts: { saveRemote?: boolean } = {}) {
  if (!state.sessionStarted) {
    return;
  }
  const saveRemote = opts.saveRemote !== false;
  state.net.resumeFromSnapshot = true;
  if (saveRemote && isNetAuthenticated()) {
    netSaveSnapshot().catch((err) => {
      setNetStatus("error", `Save failed: ${errorMessageRuntime(err)}`);
      diagBox.className = "diag warn";
      diagBox.textContent = `Return-to-title save failed: ${errorMessageRuntime(err)}`;
    });
  }
  state.queue.length = 0;
  state.useCursorActive = false;
  state.targetVerb = "";
  endLegacyConversation();
  state.legacyLedgerLines.length = 0;
  state.legacyLedgerPrompt = false;
  state.sessionStarted = false;
  setStartupMenuIndex(0);
  startStartupMenuMusic();
  diagBox.className = "diag ok";
  diagBox.textContent = "Returned to title menu.";
}

function cycleCursor(delta) {
  if (!state.cursorPixmaps || !state.cursorPixmaps.length) {
    return;
  }
  const n = state.cursorPixmaps.length;
  let idx = (state.cursorIndex + (delta | 0)) % n;
  if (idx < 0) {
    idx += n;
  }
  state.cursorIndex = idx;
  diagBox.className = "diag ok";
  diagBox.textContent = `Cursor ${idx + 1}/${n}`;
}

function jumpToPreset() {
  const p = activeCapturePreset();
  if (!p) {
    return;
  }
  state.queue.length = 0;
  state.sim.world.map_x = p.x | 0;
  state.sim.world.map_y = p.y | 0;
  state.sim.world.map_z = p.z | 0;
  diagBox.className = "diag ok";
  diagBox.textContent = `Moved camera focus to preset ${p.label}.`;
}

function captureViewportPng() {
  const composeCapture = () => {
    const margin = 14;
    const gap = 12;
    const frameBorder = 14;
    const panelW = 352;
    const worldW = canvas.width;
    const worldH = canvas.height;
    const frameW = worldW + (frameBorder * 2);
    const frameH = worldH + (frameBorder * 2);
    const outW = (margin * 2) + frameW + gap + panelW + 8;
    const outH = (margin * 2) + Math.max(frameH, 742);

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = false;

    const frameX = margin;
    const frameY = margin;
    const panelX = frameX + frameW + gap;
    const panelY = margin;

    g.fillStyle = "#070707";
    g.fillRect(0, 0, outW, outH);

    /* World frame: old-school beveled panel */
    g.fillStyle = "#c7b17f";
    g.fillRect(frameX - 4, frameY - 4, frameW + 8, frameH + 8);
    g.fillStyle = "#7a6946";
    g.fillRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4);
    g.fillStyle = "#3f3522";
    g.fillRect(frameX, frameY, frameW, frameH);
    g.fillStyle = "#101010";
    g.fillRect(frameX + frameBorder, frameY + frameBorder, worldW, worldH);
    g.drawImage(canvas, frameX + frameBorder, frameY + frameBorder, worldW, worldH);

    /* Right-side info panel with U6-like dark blue ledger look */
    const panelH = outH - (margin * 2);
    g.fillStyle = "#c7b17f";
    g.fillRect(panelX - 4, panelY - 4, panelW + 8, panelH + 8);
    g.fillStyle = "#7a6946";
    g.fillRect(panelX - 2, panelY - 2, panelW + 4, panelH + 4);
    g.fillStyle = "#111a2a";
    g.fillRect(panelX, panelY, panelW, panelH);

    const headerH = 54;
    g.fillStyle = "#1a2740";
    g.fillRect(panelX + 2, panelY + 2, panelW - 4, headerH);
    g.fillStyle = "#2e4469";
    g.fillRect(panelX + 2, panelY + headerH + 4, panelW - 4, 1);

    const textX = panelX + 14;
    let y = panelY + 22;
    g.fillStyle = "#f0d69d";
    g.font = "700 13px Silkscreen, monospace";
    g.fillText("VIRTUE MACHINE", textX, y);
    y += 16;
    g.fillStyle = "#bed0ee";
    g.font = "11px Inter, sans-serif";
    g.fillText("Ultima VI parity capture", textX, y);
    y += 15;
    g.fillStyle = "#8ea8cf";
    g.fillText("mode: legacy", textX, y);
    y = panelY + headerH + 24;

    const drawRow = (label, value) => {
      g.fillStyle = "#7f99bd";
      g.font = "11px Inter, sans-serif";
      g.fillText(label, textX, y);
      y += 13;
      g.fillStyle = "#e8f1ff";
      g.font = "700 11px Inter, sans-serif";
      g.fillText(String(value ?? "-"), textX, y);
      y += 15;
    };

    drawRow("Map Position", statPos ? statPos.textContent : "-");
    drawRow("Clock", statClock ? statClock.textContent : "-");
    drawRow("Date", statDate ? statDate.textContent : "-");
    drawRow("Tile", statTile ? statTile.textContent : "-");
    drawRow("Render Parity", statRenderParity ? statRenderParity.textContent : "-");
    drawRow("Object Overlay", statObjects ? statObjects.textContent : "-");
    drawRow("Entity Overlay", statEntities ? statEntities.textContent : "-");
    drawRow("Data Source", statSource ? statSource.textContent : "-");
    drawRow("State Hash", statHash ? statHash.textContent : "-");

    if (diagBox && diagBox.textContent) {
      y += 6;
      g.fillStyle = "#2e4469";
      g.fillRect(panelX + 10, y - 3, panelW - 20, 1);
      y += 12;
      g.fillStyle = "#7f99bd";
      g.font = "11px Inter, sans-serif";
      g.fillText("Diagnostic", textX, y);
      y += 13;
      g.fillStyle = "#d8e4f5";
      g.font = "11px Inter, sans-serif";
      const raw = diagBox.textContent.trim();
      const line = raw.length > 72 ? `${raw.slice(0, 69)}...` : raw;
      g.fillText(line, textX, y);
    }

    return out;
  };

  const p = activeCapturePreset();
  const tag = p ? p.id : "custom";
  const filename = `virtuemachine-${tag}-${state.sim.world.map_x}-${state.sim.world.map_y}-${state.sim.world.map_z}.png`;
  const link = document.createElement("a");
  const composed = composeCapture();
  link.href = composed.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  diagBox.className = "diag ok";
  diagBox.textContent = `Captured ${filename}`;
}

function captureWorldHudPng() {
  drawTileGrid();
  composeLegacyViewportFromModernGrid();
  renderLegacyHudStubOnBackdrop();

  const p = activeCapturePreset();
  const tag = p ? p.id : "custom";
  const filename = `virtuemachine-worldhud-${tag}-${state.sim.world.map_x}-${state.sim.world.map_y}-${state.sim.world.map_z}.png`;
  const out = document.createElement("canvas");

  if (legacyBackdropCanvas && legacyBackdropCanvas.width > 0 && legacyBackdropCanvas.height > 0) {
    out.width = 320;
    out.height = 200;
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(
      legacyBackdropCanvas,
      0,
      0,
      legacyBackdropCanvas.width,
      legacyBackdropCanvas.height,
      0,
      0,
      320,
      200
    );

    const dx = LEGACY_UI_MAP_RECT.x;
    const dy = LEGACY_UI_MAP_RECT.y;
    const dw = LEGACY_UI_MAP_RECT.w;
    const dh = LEGACY_UI_MAP_RECT.h;
    if (legacyViewportCanvas && legacyViewportCanvas.width > 0 && legacyViewportCanvas.height > 0) {
      g.drawImage(
        legacyViewportCanvas,
        0,
        0,
        legacyViewportCanvas.width,
        legacyViewportCanvas.height,
        dx,
        dy,
        dw,
        dh
      );
    }
  } else {
    out.width = 320;
    out.height = 200;
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 320, 200);
  }

  const link = document.createElement("a");
  link.href = out.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  diagBox.className = "diag ok";
  diagBox.textContent = `Captured ${filename}`;
}

function clampParityRadius(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 12;
  }
  return Math.max(1, Math.min(32, Math.floor(n)));
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function captureParitySnapshotJson() {
  if (!state.sessionStarted || !state.mapCtx) {
    diagBox.className = "diag warn";
    diagBox.textContent = "Parity snapshot unavailable: session not started.";
    return;
  }
  const radius = clampParityRadius(parityRadiusInput ? parityRadiusInput.value : 12);
  const cx = state.sim.world.map_x | 0;
  const cy = state.sim.world.map_y | 0;
  const cz = state.sim.world.map_z | 0;
  const viewW = (radius * 2) + 1;
  const viewH = (radius * 2) + 1;
  const startX = cx - radius;
  const startY = cy - radius;
  const viewCtx = buildLegacyViewContext(startX, startY, cz);
  const overlayBuild = buildOverlayCellsModel({
    viewW,
    viewH,
    startX,
    startY,
    wz: cz,
    viewCtx,
    objectLayer: state.tileSet ? state.objectLayer : null,
    tileFlags: state.tileFlags,
    resolveAnimatedObjectTile,
    resolveFootprintTile: (obj) => resolveDoorTileIdRuntime(state.sim, obj),
    hasWallTerrain,
    injectLegacyOverlays: null,
    isBackgroundObjectTile: (tileId) => isTileBackground(tileId)
  });
  const overlayCells = overlayBuild.overlayCells || [];
  const cells = [];
  for (let gy = 0; gy < viewH; gy += 1) {
    for (let gx = 0; gx < viewW; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      const rawTile = state.mapCtx.tileAt(wx, wy, cz) & 0xffff;
      const animTile = resolveAnimatedTile(rawTile) & 0xffff;
      const tileFlag = state.tileFlags ? (state.tileFlags[rawTile & 0x07ff] ?? 0) : 0;
      const terrain = state.terrainType ? (state.terrainType[rawTile & 0x07ff] ?? 0) : 0;
      const overlays = (overlayCells[(gy * viewW) + gx] || []).map((o, idx) => ({
        idx,
        tileHex: hex(o.tileId),
        floor: o.floor ? 1 : 0,
        occluder: o.occluder ? 1 : 0,
        sourceX: o.sourceX | 0,
        sourceY: o.sourceY | 0,
        sourceType: String(o.sourceType || "main"),
        sourceObjTypeHex: hex(o.sourceObjType ?? 0)
      }));
      const objects = state.objectLayer
        ? state.objectLayer.objectsAt(wx, wy, cz).map((o, idx) => {
          const tileId = resolveDoorTileIdRuntime(state.sim, o) & 0xffff;
          const tf = state.tileFlags ? (state.tileFlags[tileId & 0x07ff] ?? 0) : 0;
          return {
            idx,
            typeHex: hex(o.type),
            frame: o.frame | 0,
            tileHex: hex(tileId),
            tileFlagsHex: hex(tf),
            order: o.order | 0
          };
        })
        : [];
      cells.push({
        x: wx,
        y: wy,
        z: cz,
        map: {
          rawHex: hex(rawTile),
          animHex: hex(animTile),
          tileFlagsHex: hex(tileFlag),
          terrainHex: hex(terrain)
        },
        visibility: {
          visible: viewCtx ? (viewCtx.visibleAtWorld(wx, wy) ? 1 : 0) : 1,
          open: viewCtx ? (viewCtx.openAtWorld(wx, wy) ? 1 : 0) : 0
        },
        overlay: overlays,
        objects
      });
    }
  }
  const payload = {
    kind: "VirtueMachineRoomParitySnapshot",
    capturedAt: new Date().toISOString(),
    tick: state.sim.tick >>> 0,
    center: { x: cx, y: cy, z: cz },
    radius,
    bounds: {
      x0: startX,
      y0: startY,
      x1: startX + viewW - 1,
      y1: startY + viewH - 1,
      z: cz
    },
    parity: {
      overlayCount: overlayBuild.overlayCount | 0,
      hiddenSuppressedCount: overlayBuild.parity?.hiddenSuppressedCount | 0,
      spillOutOfBoundsCount: overlayBuild.parity?.spillOutOfBoundsCount | 0,
      unsortedSourceCount: overlayBuild.parity?.unsortedSourceCount | 0
    },
    cells
  };
  const copied = await copyTextToClipboard(JSON.stringify(payload, null, 2));
  if (copied) {
    setCopyStatus(true);
    diagBox.className = "diag ok";
    diagBox.textContent = `Copied parity snapshot to clipboard (center=${cx},${cy},${cz} radius=${radius}).`;
  } else {
    setCopyStatus(false, "parity snapshot copy failed");
    diagBox.className = "diag warn";
    diagBox.textContent = "Failed to copy parity snapshot to clipboard.";
  }
}

function applyCommand(sim, cmd) {
  if (cmd.type === LEGACY_COMMAND_TYPE.MOVE_AVATAR) {
    const moveResult = applyAvatarMoveCommandRuntime(sim, cmd.arg0, cmd.arg1, {
      isBlockedAt: (x, y, z) => isBlockedAt(sim, x, y, z),
      movementMode: state.movementMode
    });
    if (moveResult.kind === "pose-set-this-tick") {
      return;
    }
    if (moveResult.kind === "avatar-move") {
      state.avatarLastMoveTick = sim.tick >>> 0;
      state.avatarWalkAnimUntilMs = performance.now() + AVATAR_WALK_ANIM_WINDOW_MS;
      /*
        Canonical-facing behavior: actor pose follows occupied furniture cell.
        NPCs auto-sit from cell occupancy; mirror that for avatar on passable stools/chairs.
      */
      const landedFurniture = furnitureAtCell(sim, moveResult.targetX, moveResult.targetY);
      if (landedFurniture && isChairObjectRuntime(landedFurniture)) {
        tryInteractFurnitureObject(sim, landedFurniture);
      }
    } else if (moveResult.kind === "blocked") {
      // QoL: walking into a chair/bed acts like interaction and triggers sit/sleep.
      if (!tryInteractFurnitureObject(sim, furnitureAtCell(sim, moveResult.targetX, moveResult.targetY))) {
        playSfx(U6_SFX.BLOCKED);
      }
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.USE_FACING) {
    if (state.movementMode === "avatar") {
      tryInteractFacing(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.USE_AT_CELL) {
    if (state.movementMode === "avatar") {
      const tx = cmd.arg0 | 0;
      const ty = cmd.arg1 | 0;
      const dx = Math.sign(tx - (sim.world.map_x | 0));
      const dy = Math.sign(ty - (sim.world.map_y | 0));
      if (dx !== 0 || dy !== 0) {
        state.avatarFacingDx = dx;
        state.avatarFacingDy = dy;
      }
      tryInteractAtCell(sim, tx, ty);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.LOOK_AT_CELL) {
    if (state.movementMode === "avatar") {
      tryLookAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.TALK_AT_CELL) {
    if (state.movementMode === "avatar") {
      tryTalkAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.GET_AT_CELL) {
    if (state.movementMode === "avatar") {
      tryGetAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.ATTACK_AT_CELL) {
    if (state.movementMode === "avatar") {
      tryAttackAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.CAST_AT_CELL) {
    if (state.movementMode === "avatar") {
      tryCastAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.DROP_AT_CELL) {
    if (state.movementMode === "avatar") {
      tryDropAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.MOVE_AT_CELL) {
    if (state.movementMode === "avatar") {
      tryMoveVerbAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  } else if (cmd.type === LEGACY_COMMAND_TYPE.USE_VERB_AT_CELL) {
    if (state.movementMode === "avatar") {
      tryInteractAtCell(sim, cmd.arg0 | 0, cmd.arg1 | 0);
    }
  }
  sim.commandsApplied += 1;
}

function stepSimTick(sim, queue) {
  const nextTick = (sim.tick + 1) >>> 0;
  const { due, pending } = partitionCommandsForTickRuntime(queue, nextTick);
  for (const cmd of due) {
    applyCommand(sim, cmd);
  }

  sim.rngState = xorshift32Runtime(sim.rngState);
  sim.worldFlags ^= sim.rngState & 1;
  expireRemovedWorldPropsRuntime(sim, nextTick, WORLD_PROP_RESET_TICKS);
  if (!isNetAuthenticated() && (nextTick % TICKS_PER_MINUTE) === 0) {
    advanceWorldMinuteRuntime(sim.world, {
      minutesPerHour: MINUTES_PER_HOUR,
      hoursPerDay: HOURS_PER_DAY,
      daysPerMonth: DAYS_PER_MONTH,
      monthsPerYear: MONTHS_PER_YEAR
    });
  }
  sim.tick = nextTick;

  return pending;
}

function appendCommandLog(cmd) {
  appendCommandLogRuntime(state.commandLog, cmd, COMMAND_LOG_MAX);
}

function primeAudioFromUserGesture() {
  if (!state.audio || !state.sim?.world?.sound_enabled) {
    return;
  }
  state.audio.primeFromUserGesture().catch((err) => {
    console.warn("audio prime failed", err);
  });
}

function playSfx(sfxId, options = {}) {
  try {
    if (!state.audio || !state.sim?.world?.sound_enabled) {
      return false;
    }
    return state.audio.playSfx(sfxId, options);
  } catch (err) {
    console.warn("audio sfx failed", err);
    return false;
  }
}

function playAmbientSfx(sfxId, options = {}) {
  try {
    if (!state.audio || !state.sim?.world?.sound_enabled) {
      return false;
    }
    if (typeof state.audio.playAmbientSfx === "function") {
      return state.audio.playAmbientSfx(sfxId, options);
    }
    return state.audio.playSfx(sfxId, options);
  } catch (err) {
    console.warn("audio ambient sfx failed", err);
    return false;
  }
}

function setAudioEnabledFromWorldFlag() {
  if (!state.audio) {
    return;
  }
  const enabled = !!state.sim.world.sound_enabled;
  state.audio.setEnabled(enabled);
  if (!enabled) {
    state.musicPhase = "";
    state.musicSong = "";
  } else if (!state.sessionStarted) {
    if (state.bootIntro?.active) {
      syncBootIntroMusicPhase();
    } else {
      startStartupMenuMusic();
    }
  }
  updateAudioMuteUi();
}

function updateAudioMuteUi() {
  if (!audioMuteButton) {
    return;
  }
  const muted = !!state.audio?.status?.().muted;
  audioMuteButton.textContent = muted ? "Unmute Audio" : "Mute Audio";
  audioMuteButton.setAttribute("aria-pressed", muted ? "true" : "false");
  audioMuteButton.classList.toggle("is-active", muted);
}

function toggleAudioMute(reason = "") {
  if (!state.audio) {
    return;
  }
  const nextMuted = !state.audio.status().muted;
  state.audio.setMuted(nextMuted);
  updateAudioMuteUi();
  if (!nextMuted) {
    primeAudioFromUserGesture();
  }
  diagBox.className = "diag ok";
  diagBox.textContent = reason || (nextMuted ? "Audio muted." : "Audio unmuted.");
}

function playCanonicalMusicPhase(phase, songId) {
  try {
    if (!state.audio || !state.sim?.world?.sound_enabled) {
      return false;
    }
    const nextPhase = String(phase || "");
    const nextSong = String(songId || "");
    if (!nextSong) {
      return false;
    }
    if (state.musicPhase === nextPhase && state.musicSong === nextSong) {
      return true;
    }
    state.audio.setBackendMode("adlib");
    state.audio.setMusicEnabled(true);
    const ok = state.audio.playMusic(nextSong);
    if (ok) {
      state.musicPhase = nextPhase;
      state.musicSong = nextSong;
    }
    return ok;
  } catch (err) {
    console.warn("music phase failed", err);
    return false;
  }
}

function startBootIntroMusic() {
  return playCanonicalMusicPhase("boot_origin", "bootup.m");
}

function syncBootIntroMusicPhase() {
  const scene = currentBootIntroSceneRuntime(state.bootIntro);
  if (!scene) {
    return;
  }
  if (scene.kind === "splash") {
    playCanonicalMusicPhase("boot_origin", "bootup.m");
  } else {
    playCanonicalMusicPhase("boot_intro", "stones.m");
  }
}

function startStartupMenuMusic() {
  return playCanonicalMusicPhase("startup_menu", "ultima.m");
}

function bootIntroMusicAwaitingGesture() {
  try {
    return !!(state.bootIntro?.active && state.audio?.status?.().musicAwaitingGesture);
  } catch (_err) {
    return false;
  }
}

function ambientSfxForObjectType(type) {
  switch ((Number(type) | 0) & 0x3ff) {
    case OBJ_U6_CLOCK:
      return U6_SFX.CLOCK;
    case OBJ_U6_FOUNTAIN:
      return U6_SFX.FOUNTAIN;
    case OBJ_U6_FIREPLACE:
    case OBJ_U6_COOK_FIRE:
    case OBJ_U6_FIRE_FIELD:
    case OBJ_U6_FIRE:
      return U6_SFX.FIRE;
    case OBJ_U6_PROTECTION_FIELD:
      return U6_SFX.PROTECTION_FIELD;
    case OBJ_U6_WATER_WHEEL:
      return U6_SFX.WATER_WHEEL;
    default:
      return null;
  }
}

function updateVisibleAmbientSfx() {
  if (!state.sessionStarted || !state.objectLayer || !state.sim?.world?.sound_enabled) {
    return;
  }
  const tick = state.sim.tick >>> 0;
  const tickPhase = tick & 0xf;
  const w = state.sim.world;
  const startX = (w.map_x | 0) - (VIEW_W >> 1);
  const startY = (w.map_y | 0) - (VIEW_H >> 1);
  const visible = state.objectLayer.objectsInWindowLegacyOrder(startX, startY, VIEW_W, VIEW_H, w.map_z | 0);
  const candidates = [];
  for (const obj of visible) {
    const sfxId = ambientSfxForObjectType(obj?.type);
    if (sfxId == null) {
      continue;
    }
    const dist = Math.max(Math.abs((obj.x | 0) - (w.map_x | 0)), Math.abs((obj.y | 0) - (w.map_y | 0)));
    candidates.push({
      obj,
      sfxId,
      dist,
      priority: sfxId === U6_SFX.FOUNTAIN ? 0 : 1
    });
  }
  candidates.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (((Number(a.obj?.type) | 0) & 0x3ff) - ((Number(b.obj?.type) | 0) & 0x3ff));
  });
  for (const candidate of candidates) {
    const { obj, sfxId, dist } = candidate;
    const lastTick = Number(state.audioAmbientLastTickBySfx[String(sfxId)] || 0) >>> 0;
    const cooldown =
      sfxId === U6_SFX.CLOCK ? 8 :
      (sfxId === U6_SFX.FOUNTAIN || sfxId === U6_SFX.WATER_WHEEL) ? 2 :
      4;
    if (tick - lastTick < cooldown) {
      continue;
    }
    const volume = Math.max(0.35, Math.min(1, (9 - dist) / 8));
    const seed = ((((tick | 0) * 1103515245) ^ (((obj.x | 0) & 0xff) << 16) ^ (((obj.y | 0) & 0xff) << 8) ^ ((Number(obj.type) | 0) & 0x3ff)) >>> 0);
    if (playAmbientSfx(sfxId, { volume, distance: Math.min(7, dist), tickPhase, seed })) {
      state.audioAmbientLastTickBySfx[String(sfxId)] = tick;
      state.audioAmbientLastSfx = `0x${(((Number(obj.type) | 0) & 0x3ff)).toString(16)}:${sfxId}`;
      state.audioAmbientTriggerCount = (Number(state.audioAmbientTriggerCount) + 1) >>> 0;
      return;
    }
  }
}

function buildWireCommand(tick, type, arg0, arg1) {
  const bytes = packCommandRuntime(tick, type, arg0, arg1, COMMAND_WIRE_SIZE);
  return unpackCommandRuntime(bytes);
}

function queueMove(dx, dy) {
  if (state.legacyConversationActive) {
    return;
  }
  dx |= 0;
  dy |= 0;
  const nowMs = performance.now();
  if (shouldSuppressRepeatedMoveRuntime({
    dx,
    dy,
    lastDx: state.lastMoveInputDx,
    lastDy: state.lastMoveInputDy,
    lastQueuedAtMs: state.lastMoveQueueAtMs,
    nowMs,
    minIntervalMs: MOVE_INPUT_MIN_INTERVAL_MS
  })) {
    return;
  }
  state.lastMoveQueueAtMs = nowMs;
  state.lastMoveInputDx = dx;
  state.lastMoveInputDy = dy;
  state.avatarFacingDx = dx;
  state.avatarFacingDy = dy;
  state.avatarWalkAnimUntilMs = nowMs + AVATAR_WALK_ANIM_WINDOW_MS;
  const targetTick = (state.sim.tick + 1) >>> 0;
  const cmd = buildWireCommand(targetTick, LEGACY_COMMAND_TYPE.MOVE_AVATAR, dx, dy);

  // Keep exactly one pending move command so repeated key events cannot stack.
  if (upsertMoveCommandForTickRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    cmd,
    targetTick,
    moveType: LEGACY_COMMAND_TYPE.MOVE_AVATAR,
    commandLogMax: COMMAND_LOG_MAX
  })) {
    return;
  }

  state.queue.push(cmd);
  appendCommandLog(cmd);
}

function queueInteractDoor() {
  if (state.movementMode !== "avatar") {
    return;
  }
  const cmd = buildWireCommand(
    state.sim.tick + 1,
    LEGACY_COMMAND_TYPE.USE_FACING,
    state.avatarFacingDx | 0,
    state.avatarFacingDy | 0
  );
  enqueueCommandRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    cmd,
    commandLogMax: COMMAND_LOG_MAX
  });
}

function queueInteractAtCell(wx, wy) {
  if (state.movementMode !== "avatar") {
    return;
  }
  const tx = wx | 0;
  const ty = wy | 0;
  const cmd = buildWireCommand(state.sim.tick + 1, LEGACY_COMMAND_TYPE.USE_AT_CELL, tx, ty);
  enqueueCommandRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    cmd,
    commandLogMax: COMMAND_LOG_MAX
  });
}

function queueLegacyTargetVerb(verb, wx, wy) {
  if (state.movementMode !== "avatar") {
    return;
  }
  const v = String(verb || "").toLowerCase();
  const type = LEGACY_VERB_COMMAND_TYPE[v] | 0;
  if (!type) {
    return;
  }
  const tx = wx | 0;
  const ty = wy | 0;
  const cmd = buildWireCommand(state.sim.tick + 1, type, tx, ty);
  enqueueCommandRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    cmd,
    commandLogMax: COMMAND_LOG_MAX
  });
}

function buildBaseTileTable(bytes) {
  const out = new Uint16Array(1024);
  const n = Math.min(1024, Math.floor(bytes.length / 2));
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < n; i += 1) {
    out[i] = dv.getUint16(i * 2, true);
  }
  return out;
}

function fallbackTileColor(t) {
  return fallbackTileColorRuntime(t);
}

function tilePaletteIndex(tileId) {
  return tilePaletteIndexRuntime(tileId, state.terrainType);
}

function terrainOf(tileId) {
  if (!state.terrainType || tileId < 0 || tileId >= state.terrainType.length) {
    return 0;
  }
  return state.terrainType[tileId];
}

function hasWallTerrain(tileId) {
  return (terrainOf(tileId) & 0x04) !== 0;
}

function isTileBackground(tileId) {
  if (!state.tileFlags2) {
    return false;
  }
  return (state.tileFlags2[tileId & 0x07ff] & 0x20) !== 0;
}

function buildLegacyViewContext(startX, startY, wz) {
  if (!state.mapCtx) {
    return null;
  }
  return buildLegacyViewContextRuntime({
    dateD: state.sim.world.date_d,
    dateM: state.sim.world.date_m,
    hasWallTerrain,
    isBackgroundObjectTile: isTileBackground,
    mapTileAt: (wx, wy, z) => state.mapCtx.tileAt(wx, wy, z),
    objectsAt: state.objectLayer ? (wx, wy, z) => state.objectLayer.objectsAt(wx, wy, z) : null,
    resolveAnimatedObjectTile,
    startX,
    startY,
    tileFlagsForTile: (tileId) => state.tileFlags ? (state.tileFlags[tileId & 0x07ff] ?? 0) : 0,
    timeH: state.sim.world.time_h,
    timeM: state.sim.world.time_m,
    viewH: VIEW_H,
    viewW: VIEW_W,
    wz
  });
}

function applyLegacyCornerVariant(tileId, wx, wy, wz, viewCtx) {
  return applyLegacyCornerVariantRuntime(tileId, wx, wy, wz, {
    mapTileAt: (tx, ty, tz) => state.mapCtx.tileAt(tx, ty, tz),
    terrainOf,
    viewCtx
  });
}

function shouldBlackoutTile(rawTile, wx, wy, viewCtx) {
  return shouldBlackoutTileRuntime(rawTile, wx, wy, {
    terrainOf,
    viewCtx
  });
}

function stableCornerVariant(rawTile, wx, wy, wz, viewCtx) {
  return stableCornerVariantRuntime(rawTile, wx, wy, wz, {
    mapTileAt: (tx, ty, tz) => state.mapCtx.tileAt(tx, ty, tz),
    terrainOf,
    viewCtx
  });
}

function buildBaseTileBuffersCurrent(startX, startY, wz, viewCtx) {
  return buildBaseTileBuffersRuntime({
    isBackgroundObjectTile: isTileBackground,
    mapTileAt: state.mapCtx ? (wx, wy, z) => state.mapCtx.tileAt(wx, wy, z) : null,
    objectsAt: state.objectLayer ? (wx, wy, z) => state.objectLayer.objectsAt(wx, wy, z) : null,
    objectsInWindowLegacyOrder: state.objectLayer && typeof state.objectLayer.objectsInWindowLegacyOrder === "function"
      ? (wx, wy, w, h, z) => state.objectLayer.objectsInWindowLegacyOrder(wx, wy, w, h, z)
      : null,
    processBackgroundObjects: Boolean(state.objectLayer && state.tileFlags2),
    resolveAnimatedObjectTile,
    resolveDoorTileId: (o) => resolveDoorTileIdRuntime(state.sim, o),
    startX,
    startY,
    terrainOf,
    tileFlagsForTile: (tileId) => state.tileFlags ? (state.tileFlags[tileId & 0x07ff] ?? 0) : 0,
    viewCtx,
    viewH: VIEW_H,
    viewW: VIEW_W,
    wz
  });
}

type BaseTileBuffers = ReturnType<typeof buildBaseTileBuffersCurrent> & {
  debug: unknown;
};

function buildBaseTileBuffers(startX, startY, wz, viewCtx) {
  const base: BaseTileBuffers = {
    ...buildBaseTileBuffersCurrent(startX, startY, wz, viewCtx),
    debug: null
  };
  base.debug = null;
  return base;
}

function avatarFacingFrameOffset() {
  return directionGroupFromDxDyRuntime(state.avatarFacingDx, state.avatarFacingDy);
}

function legacyActorDirectionGroup(entity) {
  return legacyActorDirectionGroupRuntime(entity);
}

function legacyActorStandingTileId(entity, dirGroup, moving) {
  return legacyActorStandingTileIdRuntime(entity, dirGroup, moving, state.sim.tick >>> 0);
}

function sleepFrameOffsetForBed(bedObj) {
  if (!bedObj) {
    return 0;
  }
  return sleepFrameOffsetForBedAtCell(bedObj, bedObj.x | 0, bedObj.y | 0);
}

function tileFlagsForTile(tileId) {
  if (!state.tileFlags) {
    return 0;
  }
  return state.tileFlags[tileId & 0x07ff] ?? 0;
}

function furnitureOccupancyCells(obj) {
  return furnitureOccupancyCellsRuntime(obj, tileFlagsForTile);
}

function sleepBedCellFrameOffset(bedObj, wx, wy) {
  return sleepBedCellFrameOffsetRuntime(bedObj, wx, wy, tileFlagsForTile);
}

function preferredSleepCellForBed(bedObj, fromX, fromY) {
  return preferredSleepCellForBedRuntime(bedObj, fromX, fromY, tileFlagsForTile);
}

function sleepFrameOffsetForBedAtCell(bedObj, wx, wy) {
  /* Legacy AI_SLEEP path in seg_1E0F checks `(GetFrame(bed) - D_0658)`:
     only normalized 0 and 6 are valid sleep orientations, with 6 using frame 1. */
  return sleepFrameOffsetForBedAtCellRuntime(bedObj, wx, wy, tileFlagsForTile);
}

function bedInteractionScore(bedObj, fromX, fromY) {
  return bedInteractionScoreRuntime(bedObj, fromX, fromY, tileFlagsForTile);
}

function sleepBaseTileForEntity(entity) {
  if (!state.entityLayer || !state.entityLayer.baseTiles) {
    return entity.baseTile | 0;
  }
  const legacySleepBase = state.entityLayer.baseTiles[LEGACY_SLEEP_SHAPE_TYPE] ?? 0;
  return legacySleepBase > 0 ? (legacySleepBase | 0) : (entity.baseTile | 0);
}

function avatarRenderTileId() {
  if (!state.entityLayer || !state.entityLayer.entries) {
    return null;
  }
  const avatar = state.entityLayer.entries.find((e) => e.id === AVATAR_ENTITY_ID) ?? null;
  if (!avatar || !avatar.baseTile) {
    return null;
  }
  if (state.sim.avatarPose === "sleep") {
    const sleepBase = sleepBaseTileForEntity(avatar);
    let bed = findObjectByAnchor(state.sim.avatarPoseAnchor);
    if (!bed || !isBedObjectRuntime(bed)) {
      const fallback = furnitureAtCell(state.sim, state.sim.world.map_x | 0, state.sim.world.map_y | 0);
      if (fallback && isBedObjectRuntime(fallback)) {
        bed = fallback;
      }
    }
    if (bed && isBedObjectRuntime(bed)) {
      return (
        sleepBase
        + sleepFrameOffsetForBedAtCell(
          bed,
          state.sim.world.map_x | 0,
          state.sim.world.map_y | 0
        )
      ) & 0xffff;
    }
    return (sleepBase + 0) & 0xffff;
  }
  const walkMoving = Number(state.avatarWalkAnimUntilMs) >= performance.now();
  const dirGroup = avatarFacingFrameOffset();
  if (state.sim.avatarPose === "sit") {
    let chair = findObjectByAnchor(state.sim.avatarPoseAnchor);
    if (!chair || !isChairObjectRuntime(chair)) {
      const fallback = furnitureAtCell(state.sim, state.sim.world.map_x | 0, state.sim.world.map_y | 0);
      if (fallback && isChairObjectRuntime(fallback)) {
        chair = fallback;
      }
    }
    if (chair && isChairObjectRuntime(chair)) {
      const chairFrame = (chair.frame | 0) & 0x03;
      return (avatar.baseTile + 3 + (chairFrame << 2)) & 0xffff;
    }
    return (avatar.baseTile + (dirGroup << 2) + 0) & 0xffff;
  }
  return legacyActorStandingTileId(avatar, dirGroup, walkMoving);
}

function entityPoseAt(entity) {
  const explicitPose = String(entity?.authoritativePose || "").trim().toLowerCase();
  if (explicitPose === "sleep" || explicitPose === "sit" || explicitPose === "eat" || explicitPose === "play" || explicitPose === "walk") {
    return explicitPose;
  }
  if (!state.objectLayer) {
    return "stand";
  }
  const overlays = state.objectLayer.objectsAt(entity.x | 0, entity.y | 0, entity.z | 0);
  for (const o of overlays) {
    if (isBedObjectRuntime(o)) {
      return "sleep";
    }
    if (isChairObjectRuntime(o)) {
      return "sit";
    }
  }
  return "stand";
}

function entityChairAt(entity) {
  return furnitureAtWorldCell(state.sim, entity.x | 0, entity.y | 0, entity.z | 0);
}

function entityBedAt(entity) {
  if (!state.objectLayer) {
    return null;
  }
  const overlays = state.objectLayer.objectsAt(entity.x | 0, entity.y | 0, entity.z | 0);
  for (const o of overlays) {
    if (isBedObjectRuntime(o)) {
      return o;
    }
  }
  return null;
}

function entityRenderTileId(e) {
  const pose = entityPoseAt(e);
  if (pose === "sleep") {
    const sleepBase = sleepBaseTileForEntity(e);
    const bed = entityBedAt(e);
    return (sleepBase + sleepFrameOffsetForBedAtCell(bed, e.x | 0, e.y | 0)) & 0xffff;
  }
  if (pose === "sit") {
    const chair = entityChairAt(e);
    if (chair) {
      const chairFrame = chairFrameForCell(chair, e.x | 0, e.y | 0) ?? ((chair.frame | 0) & 0x03);
      return (e.baseTile + 3 + (chairFrame << 2)) & 0xffff;
    }
    return (e.baseTile + 3) & 0xffff;
  }
  if (pose === "eat" || pose === "play") {
    const chair = entityChairAt(e);
    if (chair) {
      const chairFrame = chairFrameForCell(chair, e.x | 0, e.y | 0) ?? ((chair.frame | 0) & 0x03);
      return (e.baseTile + 3 + (chairFrame << 2)) & 0xffff;
    }
    /* Legacy AI_EAT/AI_PLAY still calls C_1E0F_0664 into a stable facing frame
       even when table/chair lookup fails; do not fall through to walk animation. */
    const dirGroup = ((Number(e.authoritativeDirection ?? e.direction ?? 4) & NPC_FLAG_DIRECTION_MASK) >> 1) & 0x03;
    return legacyActorStandingTileId(e, dirGroup, false);
  }
  if (e.authoritative && (pose === "walk" || Number.isInteger(e.authoritativeDirection))) {
    const dirGroup = ((Number(e.authoritativeDirection) & NPC_FLAG_DIRECTION_MASK) >> 1) & 0x03;
    const recentAuthoritativeMove = Number.isFinite(e.authoritativeMovedAtMs)
      && (performance.now() - Number(e.authoritativeMovedAtMs)) <= 2500;
    const walking = pose === "walk" && e.authoritativePathStatus === "walking" && recentAuthoritativeMove;
    return legacyActorStandingTileId(e, dirGroup, walking);
  }
  if ((e.type | 0) >= ENTITY_TYPE_ACTOR_MIN && (e.type | 0) <= ENTITY_TYPE_ACTOR_MAX) {
    return legacyActorStandingTileId(e, legacyActorDirectionGroup(e), false);
  }
  return resolveAnimatedObjectTile(e);
}

function avatarBaseTileId() {
  if (!state.entityLayer || !state.entityLayer.entries) {
    return null;
  }
  const avatar = state.entityLayer.entries.find((e) => e.id === AVATAR_ENTITY_ID) ?? null;
  if (!avatar || !avatar.baseTile) {
    return null;
  }
  return avatar.baseTile & 0xffff;
}

function remotePlayerTileId(player) {
  const base = avatarBaseTileId();
  if (base == null) {
    return null;
  }
  const frame = remotePlayerFrameOffsetRuntime(player.facing_dx | 0, player.facing_dy | 0);
  return (base + frame) & 0xffff;
}

function tileColor(t, palette) {
  if (!palette) {
    const [r, g, b] = fallbackTileColor(t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const idx = tilePaletteIndex(t);
  const c = palette[idx] ?? [0, 0, 0];
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function paletteForTile(tileId) {
  if (!state.basePalette) {
    return null;
  }
  if (!state.enablePaletteFx || !state.tileSet || !state.tileSet.tileUsesLegacyPaletteFx(tileId)) {
    return state.basePalette;
  }
  return getRenderPalette();
}

function paletteKeyForTile(tileId) {
  if (!state.enablePaletteFx || !state.tileSet || !state.tileSet.tileUsesLegacyPaletteFx(tileId)) {
    return "pal-static";
  }
  return getRenderPaletteKey();
}

function renderCharacterStubPanel() {
  if (!charStubCanvas) {
    return;
  }
  const g = charStubCanvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, charStubCanvas.width, charStubCanvas.height);
  g.fillStyle = "#090909";
  g.fillRect(0, 0, charStubCanvas.width, charStubCanvas.height);

  const slots = [
    { x: 8, y: 8, w: 76, h: 96 },
    { x: 90, y: 8, w: 76, h: 96 },
    { x: 172, y: 8, w: 76, h: 96 },
    { x: 254, y: 8, w: 76, h: 96 }
  ];
  for (const s of slots) {
    g.fillStyle = "#111827";
    g.fillRect(s.x, s.y, s.w, s.h);
    g.strokeStyle = "#334155";
    g.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
  }

  if (!state.tileSet || !state.entityLayer || !Array.isArray(state.entityLayer.entries)) {
    g.fillStyle = "#94a3b8";
    g.font = "11px var(--vm-ui-font), monospace";
    g.fillText("Awaiting actor sprite data...", 12, 22);
    return;
  }

  const avatarTile = avatarRenderTileId();
  const px = state.sim.world.map_x | 0;
  const py = state.sim.world.map_y | 0;
  const pz = state.sim.world.map_z | 0;
  const tick = animationTick();
  const nearest = state.entityLayer.entries
    .filter((e) => e.z === pz && e.id !== AVATAR_ENTITY_ID)
    .map((e) => ({
      ...e,
      dist: Math.abs((e.x | 0) - px) + Math.abs((e.y | 0) - py)
    }))
    .sort((a, b) => {
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.id - b.id;
    })
    .slice(0, 3);

  const picks = [{ label: "AVATAR", tileId: avatarTile }];
  for (const e of nearest) {
    const t = resolveAnimatedObjectTileAtTick(
      { ...e, tileId: (e.baseTile + (e.frame | 0)) & 0xffff },
      tick
    );
    picks.push({ label: `NPC ${e.id}`, tileId: t });
  }
  while (picks.length < 4) {
    picks.push({ label: "EMPTY", tileId: null });
  }

  for (let i = 0; i < 4; i += 1) {
    const slot = slots[i];
    const pick = picks[i];
    g.fillStyle = "#9ca3af";
    g.font = "10px var(--vm-ui-font), monospace";
    g.fillText(pick.label, slot.x + 6, slot.y + 12);
    if (pick.tileId == null) {
      continue;
    }
    const pal = paletteForTile(pick.tileId);
    const key = paletteKeyForTile(pick.tileId);
    const tc = state.tileSet.tileCanvas(pick.tileId, pal, key);
    if (!tc) {
      continue;
    }
    const scale = 3;
    const dw = 16 * scale;
    const dh = 16 * scale;
    const dx = slot.x + Math.floor((slot.w - dw) / 2);
    const dy = slot.y + 20;
    g.drawImage(tc, 0, 0, 16, 16, dx, dy, dw, dh);
    g.fillStyle = "#64748b";
    g.font = "9px var(--vm-ui-font), monospace";
    g.fillText(`0x${(pick.tileId & 0xffff).toString(16)}`, slot.x + 6, slot.y + slot.h - 8);
  }
}

function parseProbeTileHex(v) {
  const s = String(v || "").trim().toLowerCase();
  const m = /^0x([0-9a-f]+)$/.exec(s);
  if (!m) {
    return null;
  }
  return parseInt(m[1], 16) & 0xffff;
}

function uiProbeHitTest(logicalX, logicalY) {
  const statusDisplay = Number(state.legacyStatusDisplay) | 0;
  const layout = buildLegacyInventoryPaperdollLayoutRuntime({
    statusDisplay,
    talkStatusDisplay: LEGACY_STATUS_DISPLAY.CMD_9E,
    talkShowInventory: (getUiProbeForRender().canonical_ui?.conversation_panel?.show_inventory) !== false
  });
  return legacyInventoryPaperdollHitTestRuntime(layout, logicalX | 0, logicalY | 0);
}

function buildOverlayCells(startX, startY, wz, viewCtx) {
  return buildOverlayCellsModel({
    viewW: VIEW_W,
    viewH: VIEW_H,
    startX,
    startY,
    wz,
    viewCtx,
    objectLayer: state.tileSet ? state.objectLayer : null,
    tileFlags: state.tileFlags,
    resolveAnimatedObjectTile,
    resolveFootprintTile: (obj) => resolveDoorTileIdRuntime(state.sim, obj),
    hasWallTerrain,
    // Canonical-only path: no client-side synthetic overlay injection.
    injectLegacyOverlays: null,
    isBackgroundObjectTile: (tileId) => isTileBackground(tileId)
  });
}

function topInteractiveOverlayAt(overlayCells, startX, startY, wx, wy) {
  return topInteractiveOverlayAtModel(overlayCells, VIEW_W, VIEW_H, startX, startY, wx, wy);
}

function measureActorOcclusionParity(overlayCells, startX, startY, viewCtx, entities) {
  return measureActorOcclusionParityModel(overlayCells, VIEW_W, VIEW_H, startX, startY, viewCtx, entities);
}

function drawLegacySelectCellMarker(g, px, py, size) {
  /* Canonical world-target selector in seg_0A33:
     SelectRange < 0 => TIL_16C (direction), else TIL_16D (select). */
  const verb = String(state.targetVerb || "");
  const range = Number(LEGACY_VERB_SELECT_RANGE[verb]);
  const selectorTileId = (range < 0) ? 0x16c : 0x16d;
  if (state.tileSet && Number.isFinite(selectorTileId)) {
    const pal = paletteForTile(selectorTileId);
    const key = paletteKeyForTile(selectorTileId);
    const marker = state.tileSet.tileCanvas(selectorTileId, pal, key);
    if (marker) {
      g.imageSmoothingEnabled = false;
      g.drawImage(marker, px, py, size, size);
      return;
    }
  }
  g.strokeStyle = "#f6d365";
  g.lineWidth = 2;
  g.strokeRect(px + 2, py + 2, size - 4, size - 4);
}

function drawTileGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0f13";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!state.sessionStarted) {
    renderStartupScreen();
    statTile.textContent = "startup";
    return;
  }

  const startX = state.sim.world.map_x - (VIEW_W >> 1);
  const startY = state.sim.world.map_y - (VIEW_H >> 1);
  if (state.useCursorActive) {
    clampUseCursorToView();
  }
  const renderPalette = getRenderPalette();
  const viewCtx = buildLegacyViewContext(startX, startY, state.sim.world.map_z);
  const { rawTiles: baseRawTiles, displayTiles: baseDisplayTiles } = buildBaseTileBuffers(startX, startY, state.sim.world.map_z, viewCtx);
  const overlayBuild = buildOverlayCells(startX, startY, state.sim.world.map_z, viewCtx);
  const overlayCells = overlayBuild.overlayCells;
  const cellIndex = (gx, gy) => (gy * VIEW_W) + gx;
  const shouldDrawOverlayEntry = (gx, gy, entry) => {
    if (!viewCtx) {
      return true;
    }
    const wx = startX + gx;
    const wy = startY + gy;
    if (viewCtx.visibleAtWorld(wx, wy)) {
      return true;
    }
    if (!entry) {
      return false;
    }
    return viewCtx.visibleAtWorld(entry.sourceX | 0, entry.sourceY | 0);
  };
  const drawOverlayEntry = (entry, px, py) => {
    const op = paletteForTile(entry.tileId);
    const ok = paletteKeyForTile(entry.tileId);
    const oc = state.tileSet.tileCanvas(entry.tileId, op, ok);
    ctx.drawImage(oc, px, py, TILE_SIZE, TILE_SIZE);
    if (state.showOverlayDebug && entry.dbg) {
      ctx.fillStyle = "rgba(7, 12, 16, 0.72)";
      ctx.fillRect(px + 3, py + 3, 48, 14);
      ctx.fillStyle = "#f5f5f5";
      ctx.font = "10px monospace";
      ctx.fillText(entry.dbg, px + 5, py + 13);
    }
  };
  const drawEntityTile = (tileId, gx, gy) => {
    if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
      return;
    }
    const wx = startX + gx;
    const wy = startY + gy;
    if (viewCtx && !viewCtx.visibleAtWorld(wx, wy)) {
      return;
    }
    const px = gx * TILE_SIZE;
    const py = gy * TILE_SIZE;
    const ep = paletteForTile(tileId);
    const ek = paletteKeyForTile(tileId);
    const ec = state.tileSet.tileCanvas(tileId, ep, ek);
    ctx.drawImage(ec, px, py, TILE_SIZE, TILE_SIZE);
  };

  let centerTile = 0;
  let centerRawTile = 0;
  let centerAnimatedTile = 0;
  let centerPaletteBand = "none";
  const overlayCount = overlayBuild.overlayCount;
  let entityCount = 0;
  for (let gy = 0; gy < VIEW_H; gy += 1) {
    for (let gx = 0; gx < VIEW_W; gx += 1) {
      const cell = cellIndex(gx, gy);
      const rawTile = baseRawTiles[cell] & 0xffff;
      const t = baseDisplayTiles[cell] & 0xffff;
      if (gx === (VIEW_W >> 1) && gy === (VIEW_H >> 1)) {
        centerTile = t;
        centerRawTile = rawTile;
      }
      const px = gx * TILE_SIZE;
      const py = gy * TILE_SIZE;
      if (state.tileSet) {
        const animRawTile = resolveAnimatedTile(rawTile);
        const animTile = resolveAnimatedTile(t);
        if (gx === (VIEW_W >> 1) && gy === (VIEW_H >> 1)) {
          centerAnimatedTile = animTile;
          const idx = tilePaletteIndex(animTile);
          if (idx >= 0xe0 && idx <= 0xef) {
            centerPaletteBand = "E0-EF";
          } else if (idx >= 0xf0 && idx <= 0xfb) {
            centerPaletteBand = "F0-FB";
          } else {
            centerPaletteBand = "static";
          }
        }
        const basePal = state.basePalette;
        const baseKey = "pal-static";
        const baseTileCanvas = state.tileSet.tileCanvas(animRawTile, basePal, baseKey);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(baseTileCanvas, px, py, TILE_SIZE, TILE_SIZE);
        const topPal = state.basePalette;
        const topKey = "pal-static";
        const tc = state.tileSet.tileCanvas(animTile, topPal, topKey);
        ctx.drawImage(tc, px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = tileColor(t, renderPalette);
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
      if (state.showGrid) {
        ctx.strokeStyle = "rgba(15, 20, 24, 0.55)";
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }
  if (overlayCells && state.tileSet) {
    for (let gy = 0; gy < VIEW_H; gy += 1) {
      for (let gx = 0; gx < VIEW_W; gx += 1) {
        const px = gx * TILE_SIZE;
        const py = gy * TILE_SIZE;
        const list = overlayCells[cellIndex(gx, gy)];
        for (const t of list) {
          if (!t.floor && shouldDrawOverlayEntry(gx, gy, t)) {
            drawOverlayEntry(t, px, py);
          }
        }
      }
    }
  }
  const entities = (state.tileSet && state.entityLayer)
    ? state.entityLayer.entitiesInView(startX, startY, state.sim.world.map_z, VIEW_W, VIEW_H)
    : [];
  if (state.tileSet && state.entityLayer) {
    for (const e of entities) {
      if (viewCtx && !viewCtx.visibleAtWorld(e.x, e.y)) {
        continue;
      }
      if (state.movementMode === "avatar" && e.id === AVATAR_ENTITY_ID) {
        continue;
      }
      const gx = e.x - startX;
      const gy = e.y - startY;
      if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
        continue;
      }
      const animEntityTile = entityRenderTileId(e);
      drawEntityTile(animEntityTile, gx, gy);
      const tf = state.tileFlags ? (state.tileFlags[animEntityTile & 0x7ff] ?? 0) : 0;
      if (tf & 0x80) {
        drawEntityTile(animEntityTile - 1, gx - 1, gy);
        if (tf & 0x40) {
          drawEntityTile(animEntityTile - 2, gx, gy - 1);
          drawEntityTile(animEntityTile - 3, gx - 1, gy - 1);
        }
      } else if (tf & 0x40) {
        drawEntityTile(animEntityTile - 1, gx, gy - 1);
      }
      entityCount += 1;
    }
  }
  if (state.tileSet && state.movementMode === "avatar") {
    const avatarTile = avatarRenderTileId();
    if (avatarTile != null) {
      drawEntityTile(avatarTile, VIEW_W >> 1, VIEW_H >> 1);
      entityCount += 1;
    }
  }
  if (state.sessionStarted && isNetAuthenticated() && Array.isArray(state.net.remotePlayers)) {
    for (const p of state.net.remotePlayers) {
      const pxw = Number(p.map_x) | 0;
      const pyw = Number(p.map_y) | 0;
      const pzw = Number(p.map_z) | 0;
      if (pzw !== (state.sim.world.map_z | 0)) {
        continue;
      }
      const gx = pxw - startX;
      const gy = pyw - startY;
      if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
        continue;
      }
      const tileId = remotePlayerTileId(p);
      if (tileId != null && state.tileSet) {
        drawEntityTile(tileId, gx, gy);
      } else {
        const px = gx * TILE_SIZE;
        const py = gy * TILE_SIZE;
        ctx.fillStyle = "rgba(80, 240, 255, 0.85)";
        ctx.fillRect(px + 18, py + 18, TILE_SIZE - 36, TILE_SIZE - 36);
      }
      const label = String(p.username || "?").slice(0, 8);
      const lx = (gx * TILE_SIZE) + 4;
      const ly = (gy * TILE_SIZE) + 12;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(lx - 2, ly - 10, (label.length * 7) + 4, 12);
      ctx.fillStyle = "#9cf6ff";
      ctx.font = "10px monospace";
      ctx.fillText(label, lx, ly - 1);
      entityCount += 1;
    }
  }
  const interactionProbe = topInteractiveOverlayAt(
    overlayCells,
    startX,
    startY,
    state.sim.world.map_x,
    state.sim.world.map_y
  );
  state.interactionProbeTile = interactionProbe ? interactionProbe.tileId : null;
  const actorOcclusionMismatch = measureActorOcclusionParity(overlayCells, startX, startY, viewCtx, entities);
  state.renderParityMismatches = overlayBuild.parity.unsortedSourceCount + actorOcclusionMismatch;

  if (!state.tileSet) {
    state.interactionProbeTile = null;
    state.renderParityMismatches = 0;
  }
  if (overlayCells && state.tileSet) {
    for (let gy = 0; gy < VIEW_H; gy += 1) {
      for (let gx = 0; gx < VIEW_W; gx += 1) {
        const px = gx * TILE_SIZE;
        const py = gy * TILE_SIZE;
        const list = overlayCells[cellIndex(gx, gy)];
        for (const t of list) {
          if (t.floor && shouldDrawOverlayEntry(gx, gy, t)) {
            drawOverlayEntry(t, px, py);
          }
        }
      }
    }
  }
  state.objectOverlayCount = overlayCount;
  state.entityOverlayCount = entityCount;
  state.centerRawTile = centerRawTile;
  state.centerAnimatedTile = centerAnimatedTile || centerTile;
  state.centerPaletteBand = centerPaletteBand;

  const cx = (VIEW_W >> 1) * TILE_SIZE;
  const cy = (VIEW_H >> 1) * TILE_SIZE;
  if (state.movementMode === "ghost" || !state.tileSet) {
    ctx.strokeStyle = "#f1f3f5";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 2, cy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }
  if (state.useCursorActive && state.movementMode === "avatar") {
    const ugx = (state.useCursorX | 0) - startX;
    const ugy = (state.useCursorY | 0) - startY;
    if (ugx >= 0 && ugy >= 0 && ugx < VIEW_W && ugy < VIEW_H) {
      const upx = ugx * TILE_SIZE;
      const upy = ugy * TILE_SIZE;
      drawLegacySelectCellMarker(ctx, upx, upy, TILE_SIZE);
    }
  }

  renderLegacyHudStubOnBackdrop();
  renderCharacterStubPanel();
  statTile.textContent = `0x${centerTile.toString(16).padStart(2, "0")}`;
}

function updateStats() {
  const w = state.sim.world;
  statTick.textContent = String(state.sim.tick);
  statPos.textContent = `${w.map_x}, ${w.map_y}, ${w.map_z}`;
  const hh = String(w.time_h).padStart(2, "0");
  const mm = String(w.time_m).padStart(2, "0");
  statClock.textContent = `${hh}:${mm}`;
  statDate.textContent = `${w.date_d} / ${w.date_m} / ${w.date_y}`;
  if (topTimeOfDay) {
    topTimeOfDay.textContent = `${timeOfDayLabelRuntime(w.time_h)} (${hh}:${mm})`;
  }
  if (topInputMode) {
    if (!state.sessionStarted) {
      topInputMode.textContent = "Title Menu";
    } else if (state.useCursorActive) {
      const label = LEGACY_TARGET_VERB_LABEL[state.targetVerb] || "Target";
      topInputMode.textContent = `${label} Target`;
    } else {
      topInputMode.textContent = state.movementMode === "avatar" ? "World" : "Ghost";
    }
  }
  statQueued.textContent = String(state.queue.length);
  if (state.objectLayer) {
    statObjects.textContent = `${state.objectOverlayCount} / ${state.objectLayer.totalLoaded}`;
  } else {
    statObjects.textContent = "0 / 0";
  }
  if (statEntities) {
    if (state.entityLayer) {
      statEntities.textContent = `${state.entityOverlayCount} / ${state.entityLayer.totalLoaded}`;
    } else {
      statEntities.textContent = "0 / 0";
    }
  }
  if (statRenderParity) {
    if (state.renderParityMismatches > 0) {
      statRenderParity.textContent = `warn (${state.renderParityMismatches})`;
    } else if (state.interactionProbeTile != null) {
      statRenderParity.textContent = `ok (probe 0x${state.interactionProbeTile.toString(16)})`;
    } else {
      statRenderParity.textContent = "ok";
    }
  }
  if (statAvatarState) {
    const facing = state.avatarFacingDx < 0 ? "W"
      : state.avatarFacingDx > 0 ? "E"
        : state.avatarFacingDy < 0 ? "N" : "S";
    const pose = state.sim.avatarPose === "sleep"
      ? "sleep"
      : (state.sim.avatarPose === "sit" ? "sit" : "stand");
    statAvatarState.textContent = state.movementMode === "avatar"
      ? `avatar (${facing}, ${pose})`
      : "ghost";
  }
  if (statNpcOcclusionBlocks) {
    statNpcOcclusionBlocks.textContent = String(state.npcOcclusionBlockedMoves);
  }
  statHash.textContent = hashHexRuntime(simStateHashRuntime(state.sim, HASH_CFG));
  if (statSimLoop) {
    statSimLoop.textContent = state.simPaused ? "paused" : "running";
  }
  if (statLoopHealth) {
    const lh = state.loopHealth;
    const last = Math.round(Math.max(0, Number(lh.lastDtMs) || 0));
    const max = Math.round(Math.max(0, Number(lh.maxDtMs) || 0));
    const prefix = state.simPaused ? "paused | " : "";
    statLoopHealth.textContent = `${prefix}dt ${last}ms / max ${max}ms | drop ${lh.backlogDrops | 0} | vis ${lh.visibilityResets | 0} | err ${lh.frameErrors | 0}`;
  }
  if (statAudio && state.audio) {
    const audio = state.audio.status();
    const muted = state.sim.world.sound_enabled ? "" : " sound-off";
    const outputMuted = audio.muted ? " output-muted" : "";
    const err = audio.lastError ? ` err:${audio.lastError}` : "";
    const music = audio.musicAwaitingGesture ? ` gesture:${audio.musicSong}` : audio.musicLoading ? ` load:${audio.musicSong}` : audio.musicPlaying ? ` music:${audio.musicSong}` : "";
    statAudio.textContent = `${audio.backendMode}${muted}${outputMuted}${music} ambient:${state.audioAmbientTriggerCount | 0} ${state.audioAmbientLastSfx || "-"}${err}`;
    updateAudioMuteUi();
  }
  if (statPalettePhase) {
    statPalettePhase.textContent = state.enablePaletteFx ? String(renderPaletteTick() & 0xff) : "off";
  }
  if (statCenterTiles) {
    statCenterTiles.textContent = `0x${state.centerRawTile.toString(16)} -> 0x${state.centerAnimatedTile.toString(16)}`;
  }
  if (statCenterBand) {
    statCenterBand.textContent = state.centerPaletteBand;
  }
  if (statNetPlayers) {
    const remote = Array.isArray(state.net.remotePlayers) ? state.net.remotePlayers.length : 0;
    statNetPlayers.textContent = String(1 + remote);
  }
  if (state.debugPanelTab === "chat") {
    renderDebugChatLedgerPanel();
  } else if (debugChatCount) {
    const count = Array.isArray(state.debugChatLedger) ? state.debugChatLedger.length : 0;
    debugChatCount.textContent = `${count} entr${count === 1 ? "y" : "ies"}`;
  }
}

function releaseReplayUrl() {
  if (state.replayUrl) {
    URL.revokeObjectURL(state.replayUrl);
    state.replayUrl = null;
  }
}

function setReplayCsv(csvText) {
  releaseReplayUrl();
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  state.replayUrl = URL.createObjectURL(blob);
  replayDownload.href = state.replayUrl;
  replayDownload.download = "virtuemachine-replay-checkpoints.csv";
  replayDownload.classList.remove("disabled");
}

function replayCheckpointsCsv(checkpoints) {
  const lines = ["tick,hash"];
  for (const cp of checkpoints) {
    lines.push(`${cp.tick},${cp.hash}`);
  }
  return `${lines.join("\n")}\n`;
}

function runReplayCheckpoints(commands, totalTicks, interval) {
  const sim = createInitialAppSimState(INITIAL_WORLD, INITIAL_SEED);
  const queue = commands.map((cmd) => ({ ...cmd }));
  const checkpoints = [];

  for (let i = 0; i < totalTicks; i += 1) {
    const pending = stepSimTick(sim, queue);
    queue.length = 0;
    queue.push(...pending);

    if ((sim.tick % interval) === 0 || sim.tick === totalTicks) {
      checkpoints.push({
        tick: sim.tick,
        hash: hashHexRuntime(simStateHashRuntime(sim, HASH_CFG))
      });
    }
  }

  return checkpoints;
}

function animationViewportHash(sim) {
  if (!state.mapCtx) {
    return null;
  }
  const wz = sim.world.map_z;
  const startX = sim.world.map_x - (VIEW_W >> 1);
  const startY = sim.world.map_y - (VIEW_H >> 1);
  const tick = sim.tick >>> 0;
  const samples = [
    [VIEW_W >> 1, VIEW_H >> 1],
    [0, 0],
    [VIEW_W - 1, 0],
    [0, VIEW_H - 1],
    [VIEW_W - 1, VIEW_H - 1]
  ];
  let h = HASH_OFFSET;
  h = hashMixU32Runtime(h, tick, HASH_CFG);

  for (const [gx, gy] of samples) {
    const wx = startX + gx;
    const wy = startY + gy;
    const rawTile = state.mapCtx.tileAt(wx, wy, wz);
    const animTile = resolveAnimatedTileAtTick(rawTile, tick);
    h = hashMixU32Runtime(h, asU32SignedRuntime(wx), HASH_CFG);
    h = hashMixU32Runtime(h, asU32SignedRuntime(wy), HASH_CFG);
    h = hashMixU32Runtime(h, animTile, HASH_CFG);
    if (state.objectLayer) {
      const overlays = state.objectLayer.objectsAt(wx, wy, wz);
      h = hashMixU32Runtime(h, overlays.length, HASH_CFG);
      for (const o of overlays) {
        const animObjTile = resolveAnimatedObjectTileAtTick(o, tick);
        h = hashMixU32Runtime(h, animObjTile, HASH_CFG);
      }
    }
  }
  return hashHexRuntime(h);
}

function runAnimationCheckpoints(commands, totalTicks, interval) {
  if (!state.mapCtx) {
    return [];
  }
  const sim = createInitialAppSimState(INITIAL_WORLD, INITIAL_SEED);
  const queue = commands.map((cmd) => ({ ...cmd }));
  const checkpoints = [];

  for (let i = 0; i < totalTicks; i += 1) {
    const pending = stepSimTick(sim, queue);
    queue.length = 0;
    queue.push(...pending);

    if ((sim.tick % interval) === 0 || sim.tick === totalTicks) {
      checkpoints.push({
        tick: sim.tick,
        hash: animationViewportHash(sim)
      });
    }
  }

  return checkpoints;
}

function verifyReplayStability() {
  const maxCommandTick = state.commandLog.reduce((maxTick, cmd) => Math.max(maxTick, cmd.tick), 0);
  const totalTicks = Math.max(state.sim.tick, maxCommandTick, 1);
  const a = runReplayCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const b = runReplayCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const aa = runAnimationCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const ab = runAnimationCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);

  const sameLength = a.length === b.length;
  const allMatch = sameLength && a.every((cp, idx) => cp.tick === b[idx].tick && cp.hash === b[idx].hash);
  const animSameLength = aa.length === ab.length;
  const animAllMatch = animSameLength && aa.every((cp, idx) => cp.tick === ab[idx].tick && cp.hash === ab[idx].hash);

  if (allMatch && animAllMatch) {
    const csv = replayCheckpointsCsv(a);
    setReplayCsv(csv);
    statReplay.textContent = `stable (${a.length} checkpoints)`;
    diagBox.className = "diag ok";
    if (aa.length) {
      diagBox.textContent = `Replay + animation verified stable over ${totalTicks} ticks. Download checkpoints.csv for baseline tracking.`;
    } else {
      diagBox.textContent = `Replay verified stable over ${totalTicks} ticks. Download checkpoints.csv for baseline tracking.`;
    }
    return;
  }

  statReplay.textContent = "mismatch";
  diagBox.className = "diag warn";
  if (!allMatch) {
    diagBox.textContent = "Replay mismatch detected. Determinism drift likely in command/tick path.";
    return;
  }
  diagBox.textContent = "Animation mismatch detected. Animated tile phase is not deterministic.";
}

function resetRun() {
  state.sim = createInitialAppSimState(INITIAL_WORLD, INITIAL_SEED);
  state.queue = [];
  state.commandLog = [];
  state.paletteFrameTick = -1;
  state.paletteFrame = null;
  state.centerRawTile = 0;
  state.centerAnimatedTile = 0;
  state.centerPaletteBand = "none";
  state.renderParityMismatches = 0;
  state.interactionProbeTile = null;
  state.useCursorActive = false;
  state.targetVerb = "";
  endLegacyConversation();
  state.avatarLastMoveTick = -1;
  state.avatarWalkAnimUntilMs = -1;
  state.lastMoveQueueAtMs = -1;
  state.lastMoveInputDx = 0;
  state.lastMoveInputDy = 1;
  state.npcOcclusionBlockedMoves = 0;
  if (state.animationFrozen) {
    state.frozenAnimationTick = state.sim.tick >>> 0;
  }
  statReplay.textContent = "not run";
  releaseReplayUrl();
  replayDownload.classList.add("disabled");
  replayDownload.removeAttribute("href");
}

function tickLoop(ts) {
  try {
    const dtMs = Math.max(0, ts - state.lastTs);
    state.loopHealth.lastDtMs = dtMs;
    if (dtMs > state.loopHealth.maxDtMs) {
      state.loopHealth.maxDtMs = dtMs;
    }
    state.accMs = Math.min(state.accMs + dtMs, LOOP_MAX_ACC_MS);
    state.lastTs = ts;
    if (state.legacyLedgerPrompt || (state.legacyConversationActive && state.legacyConversationPaging)) {
      state.legacyPromptAnimMs += dtMs;
      while (state.legacyPromptAnimMs >= LEGACY_PROMPT_FRAME_MS) {
        state.legacyPromptAnimMs -= LEGACY_PROMPT_FRAME_MS;
        state.legacyPromptAnimPhase = ((state.legacyPromptAnimPhase + 1) & 3) | 0;
      }
    }
    if (!state.sessionStarted && state.bootIntro && state.bootIntro.active) {
      const bootAdvance = advanceBootIntroRuntime(state.bootIntro, dtMs);
      if (state.bootIntro.active) {
        syncBootIntroMusicPhase();
      } else if (bootAdvance.becameInactive) {
        startStartupMenuMusic();
      }
    }
    const useCustomCursor = !!(state.cursorPixmaps && state.cursorPixmaps.length > 0);
    canvas.style.cursor = useCustomCursor ? "none" : "default";
    if (legacyBackdropCanvas) {
      legacyBackdropCanvas.style.cursor = useCustomCursor ? "none" : "default";
    }
    if (legacyViewportCanvas) {
      legacyViewportCanvas.style.cursor = useCustomCursor ? "none" : "default";
      legacyViewportCanvas.style.visibility = state.sessionStarted ? "visible" : "hidden";
      legacyViewportCanvas.style.pointerEvents = "none";
    }

    if (!state.sessionStarted || state.simPaused) {
      // Avoid stale backlog while sitting in title/login mode.
      state.accMs = 0;
    }

    let catchupSteps = 0;
    while (state.sessionStarted && !state.simPaused && state.accMs >= TICK_MS) {
      if (catchupSteps >= LOOP_MAX_CATCHUP_STEPS) {
        // Drop stale backlog caused by tab throttling/long pauses.
        state.loopHealth.backlogDrops += 1;
        state.accMs = state.accMs % TICK_MS;
        break;
      }
      catchupSteps += 1;
      state.accMs -= TICK_MS;
      state.queue = stepSimTick(state.sim, state.queue);
      updateVisibleAmbientSfx();
      if (state.entityLayer) {
        const startX = state.sim.world.map_x - (VIEW_W >> 1);
        const startY = state.sim.world.map_y - (VIEW_H >> 1);
        const viewCtx = buildLegacyViewContext(startX, startY, state.sim.world.map_z);
        const blocked = state.entityLayer.step(
          state.sim.tick,
          state.mapCtx,
          state.tileFlags,
          state.terrainType,
          state.objectLayer,
          viewCtx ? (x, y) => viewCtx.visibleAtWorld(x, y) : null
        );
        state.npcOcclusionBlockedMoves += blocked;
      }
      if (
        isNetAuthenticated()
        && !state.net.backgroundSyncPaused
        && state.sessionStarted
        && (state.sim.tick - state.net.lastPresenceHeartbeatTick) >= NET_PRESENCE_HEARTBEAT_TICKS
      ) {
        state.net.lastPresenceHeartbeatTick = state.sim.tick >>> 0;
        netSendPresenceHeartbeat().catch((err) => {
          recordBackgroundNetFailure(err, "Presence heartbeat");
        });
      }
      if (
        isNetAuthenticated()
        && !state.net.backgroundSyncPaused
        && (state.sim.tick - state.net.lastClockPollTick) >= NET_CLOCK_POLL_TICKS
      ) {
        state.net.lastClockPollTick = state.sim.tick >>> 0;
        netPollWorldClock().catch((err) => {
          recordBackgroundNetFailure(err, "Clock sync");
        });
      }
      if (
        isNetAuthenticated()
        && !state.net.backgroundSyncPaused
        && (state.sim.tick - state.net.lastPresencePollTick) >= NET_PRESENCE_POLL_TICKS
      ) {
        state.net.lastPresencePollTick = state.sim.tick >>> 0;
        netPollPresence().catch((err) => {
          recordBackgroundNetFailure(err, "Presence poll");
        });
      }
      if (
        state.net.maintenanceAuto
        && state.net.token
        && !state.net.backgroundSyncPaused
        && !state.net.maintenanceInFlight
        && (state.sim.tick % 120) === 0
        && state.sim.tick !== state.net.lastMaintenanceTick
      ) {
        netRunCriticalMaintenance({ silent: true }).catch((err) => {
          recordBackgroundNetFailure(err, "Maintenance");
          diagBox.className = "diag warn";
          diagBox.textContent = `Critical maintenance failed: ${errorMessageRuntime(err)}`;
        });
      }
      if (
        state.sessionStarted
        && !state.pristineBaselinePollInFlight
        && (state.sim.tick - state.pristineBaselineLastPollTick) >= PRISTINE_BASELINE_POLL_TICKS
      ) {
        state.pristineBaselineLastPollTick = state.sim.tick >>> 0;
        refreshPristineBaseline(false).catch((_err) => {});
      }
    }

    drawTileGrid();
    if (state.sessionStarted) {
      composeLegacyViewportFromModernGrid();
      renderLegacyHudStubOnBackdrop();
    }
    drawCustomCursorLayer();
    updateStats();
  } catch (err) {
    state.loopHealth.frameErrors += 1;
    state.accMs = 0;
    state.lastTs = performance.now();
    diagBox.className = "diag warn";
    diagBox.textContent = `Frame loop recovered from error: ${errorMessageRuntime(err)}`;
    console.error("tickLoop error", err);
  }
  requestAnimationFrame(tickLoop);
}

function clearObjectTransientState() {
  if (!state.sim) {
    return;
  }
  state.sim.doorOpenStates = {};
  state.sim.removedObjectKeys = {};
  state.sim.removedObjectAtTick = {};
  state.sim.removedObjectCount = 0;
}

async function fetchPristineBaselineVersion() {
  const res = await fetch(PRISTINE_BASELINE_VERSION_PATH, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`missing baseline version marker (${PRISTINE_BASELINE_VERSION_PATH})`);
  }
  return String(await res.text()).trim();
}

async function loadObjectBaselineFromPath(baseTiles, objectPath) {
  if (!baseTiles || baseTiles.length < 0x400) {
    throw new Error("invalid base tile table for object baseline");
  }
  const objectLayer = new U6ObjectLayerJS(baseTiles);
  await objectLayer.loadOutdoor((name) => fetch(`${objectPath}/${name}`, { cache: "no-store" }));
  const objListRes = await fetch(`${objectPath}/objlist`, { cache: "no-store" });
  if (objectLayer.filesLoaded < 64 || !objListRes.ok) {
    throw new Error(`missing object baseline at ${objectPath}`);
  }
  const objListBuf = await objListRes.arrayBuffer();
  const entityLayer = new U6EntityLayerJS(baseTiles);
  if (objListBuf.byteLength >= 0x0900) {
    entityLayer.load(new Uint8Array(objListBuf));
  }
  return { objectLayer, entityLayer, objectPath };
}

async function loadPristineObjectBaseline(baseTiles) {
  const baselinePaths = [RUNTIME_OBJECT_PATH, PRISTINE_OBJECT_PATH];
  let lastErr = null;
  for (const objectPath of baselinePaths) {
    try {
      return await loadObjectBaselineFromPath(baseTiles, objectPath);
    } catch (err) {
      lastErr = err;
    }
  }
  throw (lastErr || new Error("no valid object baseline path"));
}

async function fetchRuntimeAssetWithFallback(paths, minBytes = 1) {
  const list = Array.isArray(paths) ? paths : [];
  for (const p of list) {
    const path = String(p || "").trim();
    if (!path) continue;
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength >= (Number(minBytes) | 0)) {
        return new Uint8Array(buf);
      }
    } catch (_err) {
      /* ignore and continue fallback chain */
    }
  }
  return null;
}

function looksLikeConversationArchive(bytes, minIndexCount = 8) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 512) {
    return false;
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = Math.max(4, Number(minIndexCount) | 0);
  let validCount = 0;
  for (let i = 0; i < count; i += 1) {
    const offPtr = i << 2;
    if ((offPtr + 4) > bytes.length) {
      return false;
    }
    const offset = dv.getUint32(offPtr, true) >>> 0;
    if (offset && (offset + 4) <= bytes.length) {
      validCount += 1;
    }
  }
  /* converse.a may have zero offsets in early entries; require enough valid pointers, not all. */
  return validCount >= Math.max(2, Math.floor(count / 4));
}

function archiveHasRecoverableCanonicalTriplet(archive) {
  if (!(archive instanceof Uint8Array)) {
    return false;
  }
  const triplet = [2, 5, 6]; /* Dupre, Lord British, Nystul */
  for (const idx of triplet) {
    const script = loadLegacyConversationScriptFromArchive(archive, idx);
    const header = parseConversationHeaderAndDesc(script);
    if (!isLikelyValidConversationScript(script, header)) {
      return false;
    }
  }
  return true;
}

function loadLegacyConversationScriptFromArchive(archive, index) {
  if (!(archive instanceof Uint8Array) || archive.length < 4) {
    return null;
  }
  const idx = Number(index) | 0;
  if (idx < 0) {
    return null;
  }
  const offPtr = idx << 2;
  if (offPtr < 0 || (offPtr + 4) > archive.length) {
    return null;
  }
  const dv = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const offset = dv.getUint32(offPtr, true) >>> 0;
  if (!offset || (offset + 4) > archive.length) {
    return null;
  }
  const inflatedSize = dv.getUint32(offset, true) >>> 0;
  let bytes = null;
  if (inflatedSize && inflatedSize < 0x2800) {
    bytes = decodeU6LzwWithKnownLength(archive.subarray(offset + 4), inflatedSize);
  } else {
    const end = Math.min(archive.length, offset + 4 + 0x2800);
    bytes = archive.subarray(offset + 4, end);
  }
  if (!(bytes instanceof Uint8Array) || bytes.length < 8) {
    return null;
  }
  return bytes;
}

function validateConversationArchiveA(archive) {
  const checks = [
    { index: 5, name: "lord british", descTokens: ["ruler", "britannia"] },
    { index: 6, name: "nystul", descTokens: ["concerned", "mage"] },
    { index: 2, name: "dupre", descTokens: ["handsome", "man"] }
  ];
  for (const check of checks) {
    const script = loadLegacyConversationScriptFromArchive(archive, check.index);
    const header = parseConversationHeaderAndDesc(script);
    if (!isLikelyValidConversationScript(script, header)) {
      return false;
    }
    const gotName = normalizedNameForCompare(header?.name || "");
    if (!gotName.includes(check.name)) {
      return false;
    }
    const gotDesc = normalizedNameForCompare(header?.desc || "");
    for (const tok of check.descTokens) {
      if (!gotDesc.includes(tok)) {
        return false;
      }
    }
  }
  return true;
}

async function fetchConversationArchiveAWithValidation(paths, minBytes = 256) {
  const list = Array.isArray(paths) ? paths : [];
  for (const p of list) {
    const path = String(p || "").trim();
    if (!path) continue;
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < (Number(minBytes) | 0)) {
        continue;
      }
      const bytes = new Uint8Array(buf);
      if (validateConversationArchiveA(bytes)) {
        return bytes;
      }
    } catch (_err) {
      /* keep trying fallback paths */
    }
  }
  return null;
}

async function fetchConversationArchiveAny(paths, minBytes = 256) {
  const list = Array.isArray(paths) ? paths : [];
  for (const p of list) {
    const path = String(p || "").trim();
    if (!path) continue;
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < (Number(minBytes) | 0)) continue;
      const bytes = new Uint8Array(buf);
      if (looksLikeConversationArchive(bytes, 8) && archiveHasRecoverableCanonicalTriplet(bytes)) {
        return bytes;
      }
    } catch (_err) {
      /* continue */
    }
  }
  return null;
}

function conversationArchiveCandidatePaths(name) {
  const file = String(name || "").trim();
  if (!file) return [];
  const base = [
    `../assets/runtime/${file}`,
    `./assets/runtime/${file}`,
    `assets/runtime/${file}`,
    `../../assets/runtime/${file}`,
    `../runtime/${file}`,
    `./runtime/${file}`,
    `/assets/runtime/${file}`,
    `/modern/assets/runtime/${file}`,
    `/modern/client-web/assets/runtime/${file}`,
    `/runtime/${file}`
  ];
  return Array.from(new Set(base));
}

async function refreshPristineBaseline(force = false) {
  if (!state.tileSet || !state.objectLayer || !state.entityLayer) {
    return false;
  }
  if (state.pristineBaselinePollInFlight) {
    return false;
  }
  state.pristineBaselinePollInFlight = true;
  try {
    const version = await fetchPristineBaselineVersion();
    if (!force && version && state.pristineBaselineVersion && version === state.pristineBaselineVersion) {
      return false;
    }
    const loaded = await loadPristineObjectBaseline(state.objectLayer.baseTiles);
    state.objectLayer = loaded.objectLayer;
    state.entityLayer = loaded.entityLayer;
    state.pristineBaselineVersion = version;
    clearObjectTransientState();
    diagBox.className = "diag ok";
    diagBox.textContent = `Pristine baseline reloaded (version ${version || "unknown"}).`;
    return true;
  } catch (err) {
    diagBox.className = "diag warn";
    diagBox.textContent = `Pristine baseline reload failed: ${errorMessageRuntime(err)}`;
    return false;
  } finally {
    state.pristineBaselinePollInFlight = false;
  }
}

async function loadRuntimeAssets() {
  const required = ["map", "chunks"];
  const missing = [];

  try {
    if (!state.sessionStarted && !state.bootIntro?.played) {
      startBootIntroMusic();
    }
    state.cornerVariantCache.clear();
    for (const name of required) {
      const res = await fetch(`../assets/runtime/${name}`);
      if (!res.ok) {
        missing.push(name);
      }
    }
    if (missing.length) {
      throw new Error(`missing ${missing.join(", ")}`);
    }

    const [mapRes, chunksRes, palRes, flagRes, idxRes, maskRes, mapTileRes, objTileRes, baseTileRes, animRes, paperRes, fontRes, portraitBRes, portraitARes, titlesRes, mainmenuRes, intro1Res, intro2Res, intro3Res, introPaletteRes, introBlocksRes, introFontRes, cursorRes, lookRes, converseARes, converseBRes] = await Promise.all([
      fetch("../assets/runtime/map"),
      fetch("../assets/runtime/chunks"),
      fetch("../assets/runtime/u6pal"),
      fetch("../assets/runtime/tileflag"),
      fetch("../assets/runtime/tileindx.vga"),
      fetch("../assets/runtime/masktype.vga"),
      fetch("../assets/runtime/maptiles.vga"),
      fetch("../assets/runtime/objtiles.vga"),
      fetch("../assets/runtime/basetile"),
      fetch("../assets/runtime/animdata"),
      fetch("../assets/runtime/paper.bmp"),
      fetch("../assets/runtime/u6.ch"),
      fetch("../assets/runtime/portrait.b"),
      fetch("../assets/runtime/portrait.a"),
      fetch("../assets/runtime/titles.shp"),
      fetch("../assets/runtime/mainmenu.shp"),
      fetch("../assets/runtime/intro_1.shp"),
      fetch("../assets/runtime/intro_2.shp"),
      fetch("../assets/runtime/intro_3.shp"),
      fetch("../assets/runtime/palettes.int"),
      fetch("../assets/runtime/blocks.shp"),
      fetch("../assets/runtime/u6.set"),
      fetch("../assets/runtime/u6mcga.ptr"),
      fetch("../assets/runtime/look.lzd"),
      fetch("../assets/runtime/converse.a"),
      fetch("../assets/runtime/converse.b")
    ]);
    const [mapBuf, chunkBuf, palBuf, flagBuf, idxBuf, maskBuf, mapTileBuf, objTileBuf, baseTileBuf, animBuf, paperBuf, fontBuf, portraitBBuf, portraitABuf, titlesBuf, mainmenuBuf, intro1Buf, intro2Buf, intro3Buf, introPaletteBuf, introBlocksBuf, introFontBuf, cursorBuf, lookBuf, converseABuf, converseBBuf] = await Promise.all([
      mapRes.arrayBuffer(),
      chunksRes.arrayBuffer(),
      palRes.arrayBuffer(),
      flagRes.arrayBuffer(),
      idxRes.arrayBuffer(),
      maskRes.arrayBuffer(),
      mapTileRes.arrayBuffer(),
      objTileRes.arrayBuffer(),
      baseTileRes.arrayBuffer(),
      animRes.arrayBuffer(),
      paperRes.arrayBuffer(),
      fontRes.arrayBuffer(),
      portraitBRes.arrayBuffer(),
      portraitARes.arrayBuffer(),
      titlesRes.arrayBuffer(),
      mainmenuRes.arrayBuffer(),
      intro1Res.arrayBuffer(),
      intro2Res.arrayBuffer(),
      intro3Res.arrayBuffer(),
      introPaletteRes.arrayBuffer(),
      introBlocksRes.arrayBuffer(),
      introFontRes.arrayBuffer(),
      cursorRes.arrayBuffer(),
      lookRes.arrayBuffer(),
      converseARes.arrayBuffer(),
      converseBRes.arrayBuffer()
    ]);
    state.mapCtx = new U6MapRuntime(new Uint8Array(mapBuf), new Uint8Array(chunkBuf));
    if (palRes.ok && palBuf.byteLength >= 0x300) {
      state.basePalette = buildPaletteFromU6PalRuntime(new Uint8Array(palBuf));
      state.palette = state.basePalette;
      state.paletteFrameTick = -1;
      state.paletteFrame = null;
    } else {
      state.basePalette = null;
      state.palette = null;
    }
    if (paperRes.ok && paperBuf.byteLength >= 4) {
      state.legacyPaperPixmap = decodeLegacyPixmapRuntime(new Uint8Array(paperBuf), decompressU6Lzw);
    } else {
      state.legacyPaperPixmap = null;
    }
    if (fontRes.ok && fontBuf.byteLength >= 2048) {
      state.u6MainFont = new Uint8Array(fontBuf.slice(0, 2048));
    } else {
      state.u6MainFont = null;
    }
    if (state.basePalette) {
      state.portraitArchiveA = (portraitARes.ok && portraitABuf.byteLength > 64) ? new Uint8Array(portraitABuf) : null;
      state.portraitArchiveB = (portraitBRes.ok && portraitBBuf.byteLength > 64) ? new Uint8Array(portraitBBuf) : null;
      state.portraitCanvasCache.clear();
      let pix = null;
      if (state.portraitArchiveB) {
        pix = decodePortraitFromArchive(state.portraitArchiveB, LEGACY_AVATAR_PORTRAIT_INDEX);
      }
      if (!pix && state.portraitArchiveA) {
        pix = decodePortraitFromArchive(state.portraitArchiveA, LEGACY_AVATAR_PORTRAIT_INDEX);
      }
      state.avatarPortraitCanvas = canvasFromIndexedPixels(pix, state.basePalette);
    } else {
      state.avatarPortraitCanvas = null;
      state.portraitArchiveA = null;
      state.portraitArchiveB = null;
      state.portraitCanvasCache.clear();
    }
    if (titlesRes.ok && titlesBuf.byteLength > 8 && mainmenuRes.ok && mainmenuBuf.byteLength > 8) {
      const titles = decodeU6ShpArchive(new Uint8Array(titlesBuf));
      const menu = decodeU6ShpArchive(new Uint8Array(mainmenuBuf));
      if (titles.length >= 2 && titles[0] && titles[1] && menu.length >= 1 && menu[0]) {
        state.startupTitlePixmaps = [titles[0], titles[1]];
        state.startupMenuPixmap = menu[0];
      } else {
        state.startupTitlePixmaps = null;
        state.startupMenuPixmap = null;
      }
    } else {
      state.startupTitlePixmaps = null;
      state.startupMenuPixmap = null;
    }
    state.startupCanvasCache.clear();
    if (intro1Res.ok && intro1Buf.byteLength > 8 && intro2Res.ok && intro2Buf.byteLength > 8 && intro3Res.ok && intro3Buf.byteLength > 8) {
      const intro1 = decodeU6ShpArchive(new Uint8Array(intro1Buf));
      const intro2 = decodeU6ShpArchive(new Uint8Array(intro2Buf));
      const intro3 = decodeU6ShpArchive(new Uint8Array(intro3Buf));
      if (intro1.length >= 71 && intro2.length >= 29 && intro3.length >= 27) {
        state.bootIntroBanks = { intro1, intro2, intro3 };
      } else {
        state.bootIntroBanks = null;
      }
    } else {
      state.bootIntroBanks = null;
    }
    if (introPaletteRes.ok && introPaletteBuf.byteLength >= 0x240) {
      state.bootIntroPalettes = buildPackedIntroPalettesRuntime(new Uint8Array(introPaletteBuf));
    } else {
      state.bootIntroPalettes = null;
    }
    if (introBlocksRes.ok && introBlocksBuf.byteLength > 8) {
      const blocks = decodeU6ShpArchive(new Uint8Array(introBlocksBuf));
      state.bootIntroBlocks = blocks.length >= 4 ? blocks : null;
    } else {
      state.bootIntroBlocks = null;
    }
    if (introFontRes.ok && introFontBuf.byteLength > 8) {
      state.bootIntroFont = decodeBootIntroWouFont(new Uint8Array(introFontBuf));
    } else {
      state.bootIntroFont = null;
    }
    state.bootIntroCanvasCache.clear();
    if (state.bootIntroBanks && state.bootIntroPalettes && !state.bootIntro.played && !state.sessionStarted) {
      startBootIntroRuntime(state.bootIntro);
      syncBootIntroMusicPhase();
    }
    if (cursorRes.ok && cursorBuf.byteLength > 12) {
      state.cursorPixmaps = decodeU6CursorPtr(new Uint8Array(cursorBuf));
      state.cursorIndex = 0;
    } else {
      state.cursorPixmaps = null;
    }
    if (lookRes.ok && lookBuf.byteLength > 4) {
      state.lookStringEntries = decodeLookLzdEntriesRuntime(new Uint8Array(lookBuf), decompressU6Lzw);
    } else {
      state.lookStringEntries = null;
    }
    const converseAPrimaryRaw = (converseARes.ok && converseABuf.byteLength > 256)
      ? new Uint8Array(converseABuf)
      : null;
    const converseBPrimaryRaw = (converseBRes.ok && converseBBuf.byteLength > 256)
      ? new Uint8Array(converseBBuf)
      : null;
    const converseAPrimary = looksLikeConversationArchive(converseAPrimaryRaw, 8) ? converseAPrimaryRaw : null;
    const converseBPrimary = looksLikeConversationArchive(converseBPrimaryRaw, 4) ? converseBPrimaryRaw : null;
    let converseA = converseAPrimary;
    let converseB = converseBPrimary;
    let converseAValidated = true;
    if (converseA && !validateConversationArchiveA(converseA)) {
      converseA = null;
      converseAValidated = false;
    }
    if (!converseA) {
      converseA = await fetchConversationArchiveAWithValidation(conversationArchiveCandidatePaths("converse.a"), 256);
      if (converseA) {
        converseAValidated = true;
      }
    }
    if (!converseA) {
      converseA = await fetchConversationArchiveAny(conversationArchiveCandidatePaths("converse.a"), 256);
      if (converseA) {
        converseAValidated = false;
      }
    }
    if (!converseB) {
      converseB = await fetchRuntimeAssetWithFallback(conversationArchiveCandidatePaths("converse.b"), 256);
    }
    if (!converseB) {
      converseB = await fetchConversationArchiveAny(conversationArchiveCandidatePaths("converse.b"), 256);
    }
    if (!converseB && converseBPrimary) {
      converseB = converseBPrimary;
    }
    state.converseArchiveA = converseA;
    state.converseArchiveB = converseB;
    state.converseArchiveDiag = [
      `aRes=${converseARes.status || 0}/${converseABuf.byteLength}`,
      `bRes=${converseBRes.status || 0}/${converseBBuf.byteLength}`,
      `aLoad=${(converseA instanceof Uint8Array) ? converseA.byteLength : 0}`,
      `bLoad=${(converseB instanceof Uint8Array) ? converseB.byteLength : 0}`,
      `aValid=${converseAValidated ? 1 : 0}`
    ].join(",");
    if (!(state.converseArchiveA instanceof Uint8Array)) {
      diagBox.className = "diag warn";
      diagBox.textContent = "Conversation archive converse.a not loaded; talk falls back to tile strings.";
    } else if (!converseAValidated) {
      diagBox.className = "diag warn";
      diagBox.textContent = "Conversation archive loaded but failed canonical validation; scripts are disabled for safety.";
    }
    if (flagRes.ok && flagBuf.byteLength >= 0x1c00) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0x800, 0x1000));
      /* Legacy tileflag layout: terrain(0x800), flag1(0x800), typeWeight(0x400), flag2/D_B3EF(0x800). */
      state.tileFlags2 = new Uint8Array(flagBuf.slice(0x1400, 0x1c00));
    } else if (flagRes.ok && flagBuf.byteLength >= 0x1800) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0x800, 0x1000));
      state.tileFlags2 = new Uint8Array(flagBuf.slice(0x1000, 0x1800));
    } else if (flagRes.ok && flagBuf.byteLength >= 0x1000) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0x800, 0x1000));
      state.tileFlags2 = null;
    } else if (flagRes.ok && flagBuf.byteLength >= 0x800) {
      state.terrainType = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags = new Uint8Array(flagBuf.slice(0, 0x800));
      state.tileFlags2 = null;
    } else {
      state.tileFlags = null;
      state.tileFlags2 = null;
      state.terrainType = null;
    }

    if (
      state.palette
      && idxRes.ok && idxBuf.byteLength >= 0x200
      && maskRes.ok && maskBuf.byteLength >= 0x100
      && mapTileRes.ok && mapTileBuf.byteLength > 0
      && objTileRes.ok && objTileBuf.byteLength > 0
    ) {
      const maskDecoded = decompressU6Lzw(new Uint8Array(maskBuf));
      const mapDecoded = decompressU6Lzw(new Uint8Array(mapTileBuf));
      state.tileSet = new U6TileSetRuntime(
        new Uint8Array(idxBuf),
        maskDecoded,
        mapDecoded,
        new Uint8Array(objTileBuf),
        document,
        isLegacyPixelTransparent
      );
    } else {
      state.tileSet = null;
    }

    if (baseTileRes.ok && baseTileBuf.byteLength >= 2048) {
      const baseTiles = buildBaseTileTable(new Uint8Array(baseTileBuf));
      const loaded = await loadPristineObjectBaseline(baseTiles);
      state.objectLayer = loaded.objectLayer;
      state.entityLayer = loaded.entityLayer;
      state.pristineBaselineVersion = await fetchPristineBaselineVersion();
      state.pristineBaselineLastPollTick = state.sim.tick >>> 0;
      if (animRes.ok && animBuf.byteLength >= 2) {
        state.animData = U6AnimDataRuntime.fromBytes(new Uint8Array(animBuf));
      } else {
        state.animData = null;
      }
    } else {
      state.objectLayer = null;
      state.entityLayer = null;
      state.animData = null;
      state.pristineBaselineVersion = "";
      state.pristineBaselineLastPollTick = -1;
    }

    if (state.tileSet) {
      statSource.textContent = "runtime assets + tile art";
    } else if (state.palette) {
      statSource.textContent = "runtime assets + palette";
    } else {
      statSource.textContent = "runtime assets";
    }
    applyLegacyFrameLayout();
    diagBox.className = "diag ok";
    if (state.tileSet) {
      if (state.objectLayer && state.objectLayer.filesLoaded > 0) {
        if (state.animData) {
          const entityMsg = state.entityLayer ? ` Entity layer active (${state.entityLayer.totalLoaded} objlist actors).` : "";
          diagBox.textContent = `Runtime assets loaded with tile decoder path. Object overlay active (${state.objectLayer.totalLoaded} objects from ${state.objectLayer.filesLoaded} objblk files). Animated tile remaps active (${state.animData.entries.length} entries).${entityMsg}`;
        } else {
          const entityMsg = state.entityLayer ? ` Entity layer active (${state.entityLayer.totalLoaded} objlist actors).` : "";
          diagBox.textContent = `Runtime assets loaded with tile decoder path. Object overlay active (${state.objectLayer.totalLoaded} objects from ${state.objectLayer.filesLoaded} objblk files).${entityMsg}`;
        }
      } else {
        diagBox.textContent = "Runtime assets loaded with tile decoder path (tileindx/masktype/maptiles/objtiles). Rendering bitmap tiles.";
      }
    } else if (state.palette) {
      diagBox.textContent = "Runtime assets loaded with u6pal/tileflag decoding. Terrain tint now uses original palette data.";
    } else {
      diagBox.textContent = "Runtime assets loaded. Rendering map/chunk data from local runtime directory.";
    }
  } catch (err) {
    state.cornerVariantCache.clear();
    state.mapCtx = null;
    state.tileSet = null;
    state.objectLayer = null;
    state.entityLayer = null;
    state.animData = null;
    state.palette = null;
    state.basePalette = null;
    state.avatarPortraitCanvas = null;
    state.portraitArchiveA = null;
    state.portraitArchiveB = null;
    state.portraitCanvasCache.clear();
    state.startupTitlePixmaps = null;
    state.startupMenuPixmap = null;
    state.startupCanvasCache.clear();
    state.bootIntroBanks = null;
    state.bootIntroBlocks = null;
    state.bootIntroPalettes = null;
    state.bootIntroFont = null;
    state.bootIntroCanvasCache.clear();
    state.bootIntro.active = false;
    state.cursorPixmaps = null;
    state.u6MainFont = null;
    state.legacyPaperPixmap = null;
    state.lookStringEntries = null;
    state.tileFlags = null;
    state.tileFlags2 = null;
    state.terrainType = null;
    state.pristineBaselineVersion = "";
    state.pristineBaselineLastPollTick = -1;
    applyLegacyFrameLayout();
    statSource.textContent = "synthetic fallback";
    diagBox.className = "diag warn";
    diagBox.textContent = `Fallback active: ${errorMessageRuntime(err)}. Run ./modern/tools/validate_assets.sh and ./modern/tools/sync_assets.sh.`;
  }
}

function viewStartX() {
  return (state.sim.world.map_x | 0) - (VIEW_W >> 1);
}

function viewStartY() {
  return (state.sim.world.map_y | 0) - (VIEW_H >> 1);
}

function clampUseCursorToView() {
  const startX = viewStartX();
  const startY = viewStartY();
  const maxX = startX + VIEW_W - 1;
  const maxY = startY + VIEW_H - 1;
  state.useCursorX = clampI32Runtime(state.useCursorX | 0, startX, maxX);
  state.useCursorY = clampI32Runtime(state.useCursorY | 0, startY, maxY);
  const verb = String(state.targetVerb || "");
  const range = Number(LEGACY_VERB_SELECT_RANGE[verb]);
  if (Number.isFinite(range) && range >= 0) {
    const cx = state.sim.world.map_x | 0;
    const cy = state.sim.world.map_y | 0;
    const dx = (state.useCursorX | 0) - cx;
    const dy = (state.useCursorY | 0) - cy;
    const cheb = Math.max(Math.abs(dx), Math.abs(dy));
    if (cheb > range) {
      const s = range / Math.max(1, cheb);
      const nx = cx + Math.round(dx * s);
      const ny = cy + Math.round(dy * s);
      state.useCursorX = clampI32Runtime(nx | 0, startX, maxX);
      state.useCursorY = clampI32Runtime(ny | 0, startY, maxY);
    }
  }
}

function beginTargetCursor(verb) {
  if (state.movementMode !== "avatar") {
    return;
  }
  const v = String(verb || "").toLowerCase();
  if (!LEGACY_TARGET_VERB_LABEL[v]) {
    return;
  }
  const px = state.sim.world.map_x | 0;
  const py = state.sim.world.map_y | 0;
  /* Legacy starts selector centered on avatar tile (AimX/AimY = 5,5). */
  state.useCursorX = px;
  state.useCursorY = py;
  state.targetVerb = v;
  state.useCursorActive = true;
  clampUseCursorToView();
  diagBox.className = "diag ok";
  if ((LEGACY_VERB_SELECT_RANGE[v] | 0) < 0) {
    diagBox.textContent = `${LEGACY_TARGET_VERB_LABEL[v]}: choose direction with arrow keys, cancel with Esc.`;
  } else {
    diagBox.textContent = `${LEGACY_TARGET_VERB_LABEL[v]}: move target with arrows, confirm with Enter/U, cancel with Esc.`;
  }
}

function moveUseCursor(dx, dy) {
  if (!state.useCursorActive) {
    return;
  }
  const verb = String(state.targetVerb || "");
  const range = Number(LEGACY_VERB_SELECT_RANGE[verb]);
  if (range === -1) {
    /* Legacy directional-target commands execute on arrow toward adjacent cell. */
    const px = state.sim.world.map_x | 0;
    const py = state.sim.world.map_y | 0;
    state.useCursorX = (px + (dx | 0)) | 0;
    state.useCursorY = (py + (dy | 0)) | 0;
    clampUseCursorToView();
    commitUseCursorInteract();
    return;
  }
  state.useCursorX = (state.useCursorX + (dx | 0)) | 0;
  state.useCursorY = (state.useCursorY + (dy | 0)) | 0;
  clampUseCursorToView();
}

function commitUseCursorInteract() {
  if (!state.useCursorActive) {
    return;
  }
  const tx = state.useCursorX | 0;
  const ty = state.useCursorY | 0;
  const verb = String(state.targetVerb || "");
  if (verb) {
    queueLegacyTargetVerb(verb, tx, ty);
  } else {
    queueInteractAtCell(tx, ty);
  }
  state.useCursorActive = false;
  state.targetVerb = "";
}

function cancelTargetCursor() {
  if (!state.useCursorActive) {
    return;
  }
  state.useCursorActive = false;
  state.targetVerb = "";
  diagBox.className = "diag ok";
  diagBox.textContent = "Targeting cancelled.";
}

function moveDeltaFromKey(ev, allowDiagonal) {
  const k = String(ev.key || "").toLowerCase();
  const code = String(ev.code || "");
  /* Canonical keyboard verbs use A/C/T/L/G/D/M/U; movement stays on arrows/numpad only. */
  if (k === "arrowup" || code === "Numpad8") return [0, -1];
  if (k === "arrowdown" || code === "Numpad2") return [0, 1];
  if (k === "arrowleft" || code === "Numpad4") return [-1, 0];
  if (k === "arrowright" || code === "Numpad6") return [1, 0];
  if (!allowDiagonal) {
    return null;
  }
  if (code === "Numpad7") return [-1, -1];
  if (code === "Numpad9") return [1, -1];
  if (code === "Numpad1") return [-1, 1];
  if (code === "Numpad3") return [1, 1];
  return null;
}

function beginLegacyVerbTarget(verb) {
  if (state.movementMode !== "avatar") {
    diagBox.className = "diag warn";
    diagBox.textContent = "Legacy targeting requires Avatar mode.";
    return false;
  }
  beginTargetCursor(verb);
  return state.useCursorActive;
}

function promptNetLoginLogout() {
  if (isNetAuthenticated()) {
    netLogout();
    return;
  }
  if (countSavedProfilesRuntime(NET_PROFILE_STORAGE.storageKey) > 1) {
    refreshNetAccountSelect();
    setAccountModalOpen(true);
    setNetStatus("idle", "Choose an account in Account Setup, then login.");
    return;
  }
  netLogin().then(() => {
    diagBox.className = "diag ok";
    diagBox.textContent = `Net login ok: ${state.net.username}/${state.net.characterName}`;
  }).catch((err) => {
    setNetStatus("error", `Login failed: ${errorMessageRuntime(err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `Net login failed: ${errorMessageRuntime(err)}`;
  });
}

function saveWorldSnapshotHotkey() {
  netSaveSnapshot().then(() => {
    updateNetSessionStat();
    diagBox.className = "diag ok";
    diagBox.textContent = `World snapshot saved at tick ${state.sim.tick >>> 0}.`;
  }).catch((err) => {
    setNetStatus("error", `Save failed: ${errorMessageRuntime(err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `World save failed: ${errorMessageRuntime(err)}`;
  });
}

function loadWorldSnapshotHotkey() {
  netLoadSnapshot().then((out) => {
    updateNetSessionStat();
    diagBox.className = "diag ok";
    diagBox.textContent = `World snapshot loaded at tick ${Number(out?.snapshot_meta?.saved_tick || 0)}.`;
  }).catch((err) => {
    setNetStatus("error", `Load failed: ${errorMessageRuntime(err)}`);
    diagBox.className = "diag warn";
    diagBox.textContent = `World load failed: ${errorMessageRuntime(err)}`;
  });
}

function runtimePartyMembersForUiProbe() {
  const members = normalizePartyMemberIdsRuntime(state.partyMembers, 1);
  state.partyMembers = members.slice();
  state.sim.partySize = members.length >>> 0;
  if ((state.sim.world.active | 0) >= members.length) {
    state.sim.world.active = 0;
  }
  return members;
}

function captureUiProbeHotkey() {
  const partyMembers = runtimePartyMembersForUiProbe();
  const probe = buildUiProbeContract({
    mode: state.uiProbeMode === "sample" ? "sample" : "live",
    runtime: {
      sim: state.sim,
      commandLog: state.commandLog,
      runtimeProfile: state.runtimeProfile,
      runtimeExtensions: { ...state.runtimeExtensions },
      conversation: {
        active: !!state.legacyConversationActive,
        target_name: String(state.legacyConversationTargetName || ""),
        target_obj_num: Number(state.legacyConversationTargetObjNum) | 0,
        target_obj_type: Number(state.legacyConversationTargetObjType) | 0,
        portrait_tile_hex: state.legacyConversationPortraitTile == null
          ? null
          : `0x${(Number(state.legacyConversationPortraitTile) & 0xffff).toString(16)}`,
        show_inventory: !!state.legacyConversationShowInventory,
        equipment: Array.isArray(state.legacyConversationEquipmentSlots)
          ? state.legacyConversationEquipmentSlots
          : []
      },
      partyMembers,
      partyNameById: { ...(state.partyNameById || {}) }
    }
  });
  const digest = uiProbeDigest(probe);
  const filename = `virtuemachine-ui-probe-${state.sim.tick >>> 0}.json`;
  const debugWindow = window as VmDebugWindow;
  debugWindow.__vmLastUiProbe = probe;
  debugWindow.__vmLastUiProbeDigest = digest;
  downloadJsonFile(filename, probe);
  if (topCopyStatus) {
    topCopyStatus.textContent = `probe ${digest}`;
  }
  diagBox.className = "diag ok";
  diagBox.textContent = `UI probe captured (${digest}) and downloaded as ${filename}.`;
}

function cycleUiProbeMode() {
  state.uiProbeMode = state.uiProbeMode === "live" ? "sample" : "live";
  diagBox.className = "diag ok";
  diagBox.textContent = `Canonical UI probe mode: ${state.uiProbeMode}.`;
}

function toggleLegacyHudLayer() {
  state.legacyHudLayerHidden = !state.legacyHudLayerHidden;
  diagBox.className = "diag ok";
  diagBox.textContent = state.legacyHudLayerHidden
    ? "Legacy HUD layer hidden (deviation mode)."
    : "Legacy HUD layer visible.";
}

function getUiProbeForRender() {
  const partyMembers = runtimePartyMembersForUiProbe();
  return buildUiProbeContract({
    mode: state.uiProbeMode === "sample" ? "sample" : "live",
    runtime: {
      sim: state.sim,
      commandLog: state.commandLog,
      runtimeProfile: state.runtimeProfile,
      runtimeExtensions: { ...state.runtimeExtensions },
      conversation: {
        active: !!state.legacyConversationActive,
        target_name: String(state.legacyConversationTargetName || ""),
        target_obj_num: Number(state.legacyConversationTargetObjNum) | 0,
        target_obj_type: Number(state.legacyConversationTargetObjType) | 0,
        portrait_tile_hex: state.legacyConversationPortraitTile == null
          ? null
          : `0x${(Number(state.legacyConversationPortraitTile) & 0xffff).toString(16)}`,
        show_inventory: !!state.legacyConversationShowInventory,
        equipment: Array.isArray(state.legacyConversationEquipmentSlots)
          ? state.legacyConversationEquipmentSlots
          : []
      },
      partyMembers,
      partyNameById: { ...(state.partyNameById || {}) }
    }
  });
}

function handleLegacyHudClick(ev, surface) {
  if (!state.sessionStarted) {
    return false;
  }
  if (document.documentElement.getAttribute("data-legacy-frame-preview") !== "on") {
    return false;
  }
  if (state.legacyHudLayerHidden) {
    return false;
  }
  const s = surface || canvas;
  const rect = s.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  const sx = ((ev.clientX - rect.left) * (s.width || 0)) / rect.width;
  const sy = ((ev.clientY - rect.top) * (s.height || 0)) / rect.height;
  const logicalW = 320;
  const logicalH = 200;
  const lx = Math.floor((sx / Math.max(1, s.width)) * logicalW);
  const ly = Math.floor((sy / Math.max(1, s.height)) * logicalH);
  if (lx < 0 || ly < 0 || lx >= logicalW || ly >= logicalH) {
    return false;
  }
  const hit = uiProbeHitTest(lx, ly);
  if (!hit) {
    return false;
  }
  state.legacyHudSelection = hit;
  diagBox.className = "diag ok";
  if (hit.kind === "inventory") {
    diagBox.textContent = `Legacy HUD: inventory cell ${hit.index} (C_155D_1267).`;
  } else if (hit.kind === "portrait") {
    diagBox.textContent = "Legacy HUD: portrait cell (C_155D_1267).";
  } else {
    diagBox.textContent = `Legacy HUD: equipment slot ${hit.slot} (C_155D_130E).`;
  }
  ev.preventDefault();
  return true;
}

function runLegacyNonTargetAction(k) {
  if (k === "i") {
    /* Canonical keyboard-first panel selection: inventory/equipment (CMD_92). */
    state.legacyStatusDisplay = LEGACY_STATUS_DISPLAY.CMD_92;
    diagBox.className = "diag ok";
    diagBox.textContent = "Status: inventory/equipment.";
    return true;
  }
  if (k === "p") {
    /* Canonical keyboard-first panel selection: party/command list (CMD_91). */
    state.legacyStatusDisplay = LEGACY_STATUS_DISPLAY.CMD_91;
    diagBox.className = "diag ok";
    diagBox.textContent = "Status: party/command.";
    return true;
  }
  if (k === "r") {
    diagBox.className = "diag ok";
    diagBox.textContent = "Rest: legacy key mapped; rest system integration pending.";
    return true;
  }
  if (k === "b") {
    state.sim.world.in_combat = state.sim.world.in_combat ? 0 : 1;
    diagBox.className = "diag ok";
    diagBox.textContent = state.sim.world.in_combat ? "Combat mode: ON" : "Combat mode: OFF";
    return true;
  }
  return false;
}

function runLegacyCommandKey(k) {
  if (state.legacyConversationActive) {
    return false;
  }
  if (k === "a") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.ATTACK);
  if (k === "c") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.CAST);
  if (k === "t") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.TALK);
  if (k === "l") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.LOOK);
  if (k === "g") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.GET);
  if (k === "d") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.DROP);
  if (k === "m") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.MOVE);
  if (k === "u") return beginLegacyVerbTarget(LEGACY_TARGET_VERB.USE);
  return runLegacyNonTargetAction(k);
}

function runDebugHotkeys(ev) {
  const k = String(ev.key || "").toLowerCase();
  if (ev.ctrlKey && k === "s") {
    saveWorldSnapshotHotkey();
    return true;
  }
  if (ev.ctrlKey && k === "r") {
    loadWorldSnapshotHotkey();
    return true;
  }
  if (ev.ctrlKey && k === "z") {
    state.sim.world.sound_enabled = state.sim.world.sound_enabled ? 0 : 1;
    setAudioEnabledFromWorldFlag();
    if (state.sim.world.sound_enabled) {
      primeAudioFromUserGesture();
    }
    diagBox.className = "diag ok";
    diagBox.textContent = state.sim.world.sound_enabled ? "Sound enabled." : "Sound disabled.";
    return true;
  }
  if (ev.ctrlKey && k === "h") {
    const helpPanel = document.querySelector(".vm-help");
    if (helpPanel) {
      helpPanel.classList.toggle("hidden");
      diagBox.className = "diag ok";
      diagBox.textContent = helpPanel.classList.contains("hidden") ? "Help hidden." : "Help visible.";
    }
    return true;
  }
  if (ev.ctrlKey && k === "v") {
    diagBox.className = "diag ok";
    diagBox.textContent = "VirtueMachine: legacy Ctrl+V key mapped (version string TBD).";
    return true;
  }
  if (!ev.shiftKey) {
    return false;
  }
  if (k === "i") {
    promptNetLoginLogout();
    return true;
  }
  if (k === "y") {
    saveWorldSnapshotHotkey();
    return true;
  }
  if (k === "u") {
    loadWorldSnapshotHotkey();
    return true;
  }
  if (k === "j") {
    captureUiProbeHotkey();
    return true;
  }
  if (k === "k") {
    toggleLegacyHudLayer();
    return true;
  }
  if (k === "l") {
    cycleUiProbeMode();
    return true;
  }
  if (k === "n") {
    netRunCriticalMaintenance({ silent: false }).catch((err) => {
      setNetStatus("error", `Maintenance failed: ${errorMessageRuntime(err)}`);
      diagBox.className = "diag warn";
      diagBox.textContent = `Critical maintenance failed: ${errorMessageRuntime(err)}`;
    });
    return true;
  }
  if (k === "p") {
    if (ev.altKey) {
      captureWorldHudPng();
    } else {
      captureViewportPng();
    }
    return true;
  }
  if (k === "o") {
    setOverlayDebug(!state.showOverlayDebug);
    return true;
  }
  if (k === "f") {
    setAnimationMode(state.animationFrozen ? "live" : "freeze");
    return true;
  }
  if (k === "b") {
    setPaletteFxMode(!state.enablePaletteFx);
    return true;
  }
  if (k === "m") {
    setMovementMode(state.movementMode === "avatar" ? "ghost" : "avatar");
    return true;
  }
  if (k === "g") {
    jumpToPreset();
    return true;
  }
  if (k === "r") {
    resetRun();
    return true;
  }
  if (k === "v") {
    verifyReplayStability();
    return true;
  }
  if (ev.code === "Comma") {
    cycleCursor(-1);
    return true;
  }
  if (ev.code === "Period") {
    cycleCursor(1);
    return true;
  }
  if (ev.code === "BracketLeft") {
    cycleLegacyScaleMode(-1);
    return true;
  }
  if (ev.code === "BracketRight") {
    cycleLegacyScaleMode(1);
    return true;
  }
  return false;
}

window.addEventListener("keydown", (ev) => {
  primeAudioFromUserGesture();
  if (netAccountModal && !netAccountModal.classList.contains("hidden")) {
    if (ev.key === "Escape") {
      setAccountModalOpen(false);
      ev.preventDefault();
    }
    return;
  }
  if (isTypingContextRuntime(ev.target)) {
    return;
  }

  const k = String(ev.key || "").toLowerCase();
  if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
    const isHoverCopyCombo = k === "c" && ev.shiftKey;
    if (!isHoverCopyCombo) {
      // Let browser/system shortcuts work (copy/paste/select-all/find/etc).
      return;
    }
  }
  if (!state.sessionStarted) {
    if (state.bootIntro && state.bootIntro.active) {
      if (bootIntroMusicAwaitingGesture()) {
        ev.preventDefault();
        return;
      }
      if (k === "escape") {
        abortBootIntroRuntime(state.bootIntro);
        ev.preventDefault();
        return;
      }
      if (advanceBootIntroInputRuntime(state.bootIntro)) {
        if (state.bootIntro.active) {
          syncBootIntroMusicPhase();
        } else {
          startStartupMenuMusic();
        }
        ev.preventDefault();
        return;
      }
      return;
    }
    if (k === "arrowup") {
      setStartupMenuIndex(state.startupMenuIndex - 1);
    } else if (k === "arrowdown") {
      setStartupMenuIndex(state.startupMenuIndex + 1);
    } else if (k === "i") {
      setStartupMenuIndex(0);
      activateStartupMenuSelection();
    } else if (k === "c") {
      setStartupMenuIndex(1);
      activateStartupMenuSelection();
    } else if (k === "t") {
      setStartupMenuIndex(2);
      activateStartupMenuSelection();
    } else if (k === "a") {
      setStartupMenuIndex(3);
      activateStartupMenuSelection();
    } else if (k === "j") {
      setStartupMenuIndex(4);
      activateStartupMenuSelection();
    } else if (k === "enter" || k === " ") {
      activateStartupMenuSelection();
    } else {
      return;
    }
    ev.preventDefault();
    return;
  }

  if (k === "q") {
    returnToTitleMenu();
    ev.preventDefault();
    return;
  }
  if (
    ((k === "c" && ev.shiftKey && ev.ctrlKey && !ev.altKey && !ev.metaKey)
      || (ev.code === "Backquote" && ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey))
  ) {
    if (topCopyStatus) {
      topCopyStatus.textContent = "copying...";
    }
    void copyHoverReportToClipboard();
    ev.preventDefault();
    return;
  }

  if (state.legacyConversationActive) {
    if (handleLegacyConversationKeydown(ev)) {
      ev.preventDefault();
      return;
    }
    if (runDebugHotkeys(ev)) {
      ev.preventDefault();
    }
    return;
  }

  if (state.useCursorActive) {
    const delta = moveDeltaFromKey(ev, true);
    if (delta) {
      moveUseCursor(delta[0], delta[1]);
      ev.preventDefault();
      return;
    }
    if (k === "u" || k === "enter" || k === " ") {
      commitUseCursorInteract();
      ev.preventDefault();
      return;
    }
    if (k === "escape") {
      cancelTargetCursor();
      ev.preventDefault();
      return;
    }
    if (runLegacyCommandKey(k)) {
      ev.preventDefault();
      return;
    }
    if (runDebugHotkeys(ev)) {
      ev.preventDefault();
      return;
    }
    return;
  }

  const delta = moveDeltaFromKey(ev, false);
  if (delta) {
    queueMove(delta[0], delta[1]);
    ev.preventDefault();
    return;
  }

  if (k === " " || k === "escape") {
    diagBox.className = "diag ok";
    diagBox.textContent = "Pass turn.";
    ev.preventDefault();
    return;
  }
  if ((ev.code.startsWith("Digit") || ev.code.startsWith("Numpad")) && k >= "0" && k <= "9") {
    const resolution = resolvePartySwitchDigitRuntime({
      digitKey: k,
      partyMembers: state.partyMembers,
      activeIndex: state.sim.world.active
    });
    state.partyMembers = normalizePartyMemberIdsRuntime(state.partyMembers, 1);
    state.sim.partySize = state.partyMembers.length >>> 0;
    if (resolution.changed) {
      state.sim.world.active = resolution.next_active_index | 0;
      diagBox.className = "diag ok";
      diagBox.textContent = `Party switch ${k}: active index ${resolution.next_active_index}.`;
      ev.preventDefault();
      return;
    }
    diagBox.className = "diag ok";
    if (resolution.reason === "same_index") {
      diagBox.textContent = `Party switch ${k}: already active.`;
    } else if (resolution.reason === "out_of_range") {
      diagBox.textContent = `Party switch ${k}: no party member at that slot.`;
    } else {
      diagBox.textContent = `Party switch ${k}: ignored.`;
    }
    ev.preventDefault();
    return;
  }
  if (runLegacyCommandKey(k)) {
    ev.preventDefault();
    return;
  }
  if (runDebugHotkeys(ev)) {
    ev.preventDefault();
  }
}, true);

function startupMenuIndexAtEvent(ev, surface) {
  const s = surface || canvas;
  const rect = s.getBoundingClientRect();
  return startupMenuIndexAtSurfacePointRuntime(
    ev.clientX,
    ev.clientY,
    { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    { width: s.width || 0, height: s.height || 0 },
    STARTUP_MENU_HITBOX
  );
}

function hoveredWorldCellFromMouse() {
  if (!state.sessionStarted || !state.mouseInCanvas || !state.mapCtx) {
    return null;
  }
  const wz = state.sim.world.map_z | 0;
  const startX = (state.sim.world.map_x | 0) - (VIEW_W >> 1);
  const startY = (state.sim.world.map_y | 0) - (VIEW_H >> 1);
  if (isLegacyFramePreviewOn() && legacyBackdropCanvas) {
    const bw = legacyBackdropCanvas.width | 0;
    const bh = legacyBackdropCanvas.height | 0;
    if (bw <= 0 || bh <= 0) {
      return null;
    }
    const mx = Math.floor(state.mouseNormX * bw);
    const my = Math.floor(state.mouseNormY * bh);
    const scale = Math.max(1, Math.floor(bw / 320));
    const mapX = LEGACY_UI_MAP_RECT.x * scale;
    const mapY = LEGACY_UI_MAP_RECT.y * scale;
    const mapW = LEGACY_UI_MAP_RECT.w * scale;
    const mapH = LEGACY_UI_MAP_RECT.h * scale;
    if (mx < mapX || mx >= (mapX + mapW) || my < mapY || my >= (mapY + mapH)) {
      return null;
    }
    const lx = (mx - mapX) / scale;
    const ly = (my - mapY) / scale;
    const gx = clampI32Runtime(Math.floor((lx / 160) * VIEW_W), 0, VIEW_W - 1);
    const gy = clampI32Runtime(Math.floor((ly / 160) * VIEW_H), 0, VIEW_H - 1);
    return { x: startX + gx, y: startY + gy, z: wz, gx, gy, startX, startY };
  }

  const w = canvas.width | 0;
  const h = canvas.height | 0;
  if (w <= 0 || h <= 0) {
    return null;
  }
  const mx = Math.floor(state.mouseNormX * w);
  const my = Math.floor(state.mouseNormY * h);
  const gx = clampI32Runtime(Math.floor((mx / w) * VIEW_W), 0, VIEW_W - 1);
  const gy = clampI32Runtime(Math.floor((my / h) * VIEW_H), 0, VIEW_H - 1);
  return { x: startX + gx, y: startY + gy, z: wz, gx, gy, startX, startY };
}

function hex(value, width = 0) {
  const n = Number(value) >>> 0;
  const s = n.toString(16);
  return `0x${width > 0 ? s.padStart(width, "0") : s}`;
}

function buildHoverReportText() {
  let cell = hoveredWorldCellFromMouse();
  if (!cell && state.sessionStarted && state.mapCtx && state.sim && state.sim.world) {
    const wz = state.sim.world.map_z | 0;
    const startX = (state.sim.world.map_x | 0) - (VIEW_W >> 1);
    const startY = (state.sim.world.map_y | 0) - (VIEW_H >> 1);
    const gx = VIEW_W >> 1;
    const gy = VIEW_H >> 1;
    cell = {
      x: state.sim.world.map_x | 0,
      y: state.sim.world.map_y | 0,
      z: wz,
      gx,
      gy,
      startX,
      startY
    };
  }
  if (!cell || !state.mapCtx) {
    return null;
  }
  const wx = cell.x | 0;
  const wy = cell.y | 0;
  const wz = cell.z | 0;
  const tick = animationTick();
  const rawTile = state.mapCtx.tileAt(wx, wy, wz) & 0xffff;
  const animTile = resolveAnimatedTileAtTick(rawTile, tick) & 0xffff;
  const tileFlag = state.tileFlags ? (state.tileFlags[rawTile & 0x07ff] ?? 0) : 0;
  const terrain = state.terrainType ? (state.terrainType[rawTile & 0x07ff] ?? 0) : 0;
  const viewCtx = buildLegacyViewContext(cell.startX, cell.startY, wz);
  const visible = viewCtx ? (viewCtx.visibleAtWorld(wx, wy) ? 1 : 0) : 1;
  const open = viewCtx ? (viewCtx.openAtWorld(wx, wy) ? 1 : 0) : 0;

  const overlayBuild = buildOverlayCells(cell.startX, cell.startY, wz, viewCtx);
  const list = overlayBuild.overlayCells
    ? (overlayBuild.overlayCells[(cell.gy * VIEW_W) + cell.gx] || [])
    : [];
  const overlays = list.map((o, idx) => (
    `overlay[${idx}]: tile=${hex(o.tileId)} floor=${o.floor ? 1 : 0} occ=${o.occluder ? 1 : 0} src=${o.sourceX},${o.sourceY} ${o.sourceType}`
  ));

  const objects = state.objectLayer ? state.objectLayer.objectsAt(wx, wy, wz) : [];
  const objLines = objects.map((o, idx) => {
    const tileId = resolveDoorTileIdRuntime(state.sim, o) & 0xffff;
    const tf = state.tileFlags ? (state.tileFlags[tileId & 0x07ff] ?? 0) : 0;
    return `obj[${idx}]: type=${hex(o.type)} frame=${o.frame | 0} tile=${hex(tileId)} tf=${hex(tf)} order=${o.order | 0} lord=${Number(o.legacyOrder || 0) | 0} achild=${Number(o.assocChildCount || 0) | 0} a0010=${Number(o.assocChild0010Count || 0) | 0}`;
  });

  const lines = [
    "VirtueMachine Hover Report",
    `cell: ${wx},${wy},${wz}`,
    `map: raw=${hex(rawTile)} anim=${hex(animTile)} tf=${hex(tileFlag)} terrain=${hex(terrain)}`,
    `visibility: visible=${visible} open=${open}`
  ];
  if (overlays.length) {
    lines.push(...overlays);
  } else {
    lines.push("overlay: none");
  }
  if (objLines.length) {
    lines.push(...objLines);
  } else {
    lines.push("objects@cell: none");
  }
  return lines.join("\n");
}

async function copyHoverReportToClipboard(options: { enrich?: boolean } = {}) {
  const enrich = options.enrich !== false;
  const report = buildHoverReportText();
  if (!report) {
    diagBox.className = "diag warn";
    diagBox.textContent = "Hover report unavailable. Move cursor over the world view.";
    return;
  }
  let enrichedReport = report;
  if (enrich) {
    try {
      const cell = hoveredWorldCellFromMouse();
      if (cell && isNetAuthenticated()) {
        const out = await netFetchWorldObjectsAtCell(cell.x | 0, cell.y | 0, cell.z | 0);
        if (out && Array.isArray(out.objects)) {
          const rows = [];
          rows.push("server_objects:");
          if (!out.objects.length) {
            rows.push("server_obj: none");
          } else {
            for (let i = 0; i < out.objects.length; i += 1) {
              const o = out.objects[i];
              const fp = Array.isArray(o.footprint)
                ? o.footprint.map((c) => `${Number(c.x) | 0},${Number(c.y) | 0},${Number(c.z) | 0}`).join(" ")
                : "";
              rows.push(
                `server_obj[${i}]: key=${String(o.object_key || "")} type=${hex(o.type)} frame=${Number(o.frame) | 0} tile=${hex(o.tile_id)} xyz=${Number(o.x) | 0},${Number(o.y) | 0},${Number(o.z) | 0} src=${String(o.source_kind || "baseline")} status=${hex(Number(o.status) | 0)} cu=${hex((Number(o.status) | 0) & 0x18)} hk=${String(o.holder_kind || "none")} hid=${String(o.holder_id || "")} hkey=${String(o.holder_key || "")} root=${String(o.root_anchor_key || "")} blocked=${String(o.blocked_by || "")} chain=${Array.isArray(o.assoc_chain) ? o.assoc_chain.join(">") : ""} area=${Number(o.source_area) | 0} idx=${Number(o.source_index) | 0} lord=${Number(o.legacy_order || 0) | 0} achild=${Number(o.assoc_child_count || 0) | 0} a0010=${Number(o.assoc_child_0010_count || 0) | 0}${fp ? ` fp=${fp}` : ""}`
              );
            }
          }
          enrichedReport = `${report}\n${rows.join("\n")}`;
        }
      }
    } catch (_err) {
      // Keep base local hover report available if net authority fetch fails.
    }
  }
  const ok = await copyTextToClipboard(enrichedReport);
  if (ok) {
    const line = enrichedReport.split("\n")[1] || "";
    diagBox.className = "diag ok";
    if (diagBox && diagBox.dataset) {
      delete diagBox.dataset.copyError;
    }
    diagBox.textContent = `Copied hover report (${line.replace(/^cell:\\s*/, "")}).`;
    setCopyStatus(true);
  } else {
    diagBox.className = "diag warn";
    const why = diagBox && diagBox.dataset && diagBox.dataset.copyError
      ? ` (${diagBox.dataset.copyError})`
      : "";
    diagBox.textContent = `Failed to copy hover report to clipboard${why}.`;
    setCopyStatus(false, why.replace(/^\s*\(|\)\s*$/g, ""));
  }
}

function handleShiftContextMenu(ev, surface) {
  if (!ev.shiftKey) {
    return;
  }
  ev.preventDefault();
}

function handleShiftRightMouseDownCopy(ev, surface) {
  if (!ev.shiftKey || ev.button !== 2) {
    return;
  }
  ev.preventDefault();
  ev.stopPropagation();
  updateCanvasMouseFromEvent(ev, surface);
  setCopyStatus(false, "copying...");
  const report = buildHoverReportText();
  if (!report) {
    diagBox.className = "diag warn";
    diagBox.textContent = "Hover report unavailable. Move cursor over the world view.";
    setCopyStatus(false, "no hover cell");
    return;
  }
  const sync = copyTextToClipboardSync(report);
  if (sync.ok) {
    if (diagBox && diagBox.dataset) {
      delete diagBox.dataset.copyError;
    }
    diagBox.className = "diag ok";
    const line = report.split("\n")[1] || "";
    diagBox.textContent = `Copied hover report (${line.replace(/^cell:\\s*/, "")}).`;
    setCopyStatus(true);
    return;
  }
  setCopyStatus(false, sync.reason || "copy blocked");
}

function activeCursorSurface() {
  if (isLegacyFramePreviewOn()) {
    if (legacyBackdropCanvas) {
      return legacyBackdropCanvas;
    }
  }
  return canvas;
}

function updateCanvasMouseFromEvent(ev, surface) {
  const s = activeCursorSurface() || surface || canvas;
  const rect = s.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }
  const nx = (ev.clientX - rect.left) / rect.width;
  const ny = (ev.clientY - rect.top) / rect.height;
  state.mouseNormX = Math.max(0, Math.min(1, nx));
  state.mouseNormY = Math.max(0, Math.min(1, ny));
  state.mouseInCanvas = true;
}

canvas.addEventListener("mousemove", (ev) => {
  updateCanvasMouseFromEvent(ev, canvas);
  if (state.sessionStarted || (state.bootIntro && state.bootIntro.active)) {
    return;
  }
  const idx = startupMenuIndexAtEvent(ev, canvas);
  if (idx >= 0) {
    setStartupMenuIndex(idx);
  }
});

canvas.addEventListener("contextmenu", (ev) => {
  handleShiftContextMenu(ev, canvas);
});

canvas.addEventListener("mousedown", (ev) => {
  handleShiftRightMouseDownCopy(ev, canvas);
});

canvas.addEventListener("click", (ev) => {
  primeAudioFromUserGesture();
  updateCanvasMouseFromEvent(ev, canvas);
  if (state.sessionStarted) {
    return;
  }
  if (state.bootIntro && state.bootIntro.active) {
    if (bootIntroMusicAwaitingGesture()) {
      ev.preventDefault();
      return;
    }
    if (advanceBootIntroInputRuntime(state.bootIntro)) {
      if (state.bootIntro.active) {
        syncBootIntroMusicPhase();
      } else {
        startStartupMenuMusic();
      }
      return;
    }
    return;
  }
  const idx = startupMenuIndexAtEvent(ev, canvas);
  if (idx < 0) {
    return;
  }
  setStartupMenuIndex(idx);
  activateStartupMenuSelection();
});

canvas.addEventListener("mouseenter", (ev) => {
  updateCanvasMouseFromEvent(ev, canvas);
});

canvas.addEventListener("mouseleave", () => {
  state.mouseInCanvas = false;
});

if (legacyBackdropCanvas) {
  legacyBackdropCanvas.addEventListener("mousemove", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyBackdropCanvas);
    if (state.sessionStarted || (state.bootIntro && state.bootIntro.active)) {
      return;
    }
    const idx = startupMenuIndexAtEvent(ev, legacyBackdropCanvas);
    if (idx >= 0) {
      setStartupMenuIndex(idx);
    }
  });

  legacyBackdropCanvas.addEventListener("click", (ev) => {
    primeAudioFromUserGesture();
    updateCanvasMouseFromEvent(ev, legacyBackdropCanvas);
    if (state.sessionStarted) {
      if (handleLegacyHudClick(ev, legacyBackdropCanvas)) {
        return;
      }
      return;
    }
    if (state.bootIntro && state.bootIntro.active) {
      if (bootIntroMusicAwaitingGesture()) {
        ev.preventDefault();
        return;
      }
      if (advanceBootIntroInputRuntime(state.bootIntro)) {
        if (state.bootIntro.active) {
          syncBootIntroMusicPhase();
        } else {
          startStartupMenuMusic();
        }
        return;
      }
      return;
    }
    const idx = startupMenuIndexAtEvent(ev, legacyBackdropCanvas);
    if (idx < 0) {
      return;
    }
    setStartupMenuIndex(idx);
    activateStartupMenuSelection();
  });

  legacyBackdropCanvas.addEventListener("contextmenu", (ev) => {
    handleShiftContextMenu(ev, legacyBackdropCanvas);
  });

  legacyBackdropCanvas.addEventListener("mousedown", (ev) => {
    handleShiftRightMouseDownCopy(ev, legacyBackdropCanvas);
  });

  legacyBackdropCanvas.addEventListener("mouseenter", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyBackdropCanvas);
  });

  legacyBackdropCanvas.addEventListener("mouseleave", () => {
    state.mouseInCanvas = false;
  });
}

if (legacyViewportCanvas) {
  legacyViewportCanvas.addEventListener("mousemove", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyViewportCanvas);
  });

  legacyViewportCanvas.addEventListener("mouseenter", (ev) => {
    updateCanvasMouseFromEvent(ev, legacyViewportCanvas);
  });

  legacyViewportCanvas.addEventListener("contextmenu", (ev) => {
    handleShiftContextMenu(ev, legacyViewportCanvas);
  });

  legacyViewportCanvas.addEventListener("mousedown", (ev) => {
    handleShiftRightMouseDownCopy(ev, legacyViewportCanvas);
  });

  legacyViewportCanvas.addEventListener("mouseleave", () => {
    state.mouseInCanvas = false;
  });
}

window.addEventListener("resize", () => {
  applyLegacyFrameLayout();
});

document.addEventListener("visibilitychange", () => {
  state.loopHealth.visibilityResets += 1;
  state.loopHealth.lastDtMs = 0;
  state.lastTs = performance.now();
  state.accMs = 0;
});

loadRuntimeAssets().finally(() => {
  state.runtimeReady = true;
  const extSummary = runtimeExtensionsSummary(state.runtimeExtensions);
  const runtimeModeText = extSummary.length
    ? `${state.runtimeProfile} + ${extSummary.join(",")}`
    : state.runtimeProfile;
  if (state.mapCtx) {
    diagBox.className = "diag ok";
    diagBox.textContent = `Startup menu ready (${runtimeModeText}): select Journey Onward to enter the throne room.`;
  } else {
    diagBox.className = "diag warn";
    diagBox.textContent = `Assets missing (${runtimeModeText}): startup menu running in fallback mode.`;
  }
  requestAnimationFrame((ts) => {
    state.lastTs = ts;
    requestAnimationFrame(tickLoop);
  });
});

initRuntimeProfileConfig();
initTheme();
initFont();
initGrid();
initOverlayDebug();
initAnimationMode();
initPaletteFxMode();
initMovementMode();
initLegacyScaleMode();
initLegacyFramePreview();
initCapturePresets();
initNetPanel();
initPanelCopyButtons();
setStartupMenuIndex(0);
if (jumpButton) {
  jumpButton.addEventListener("click", jumpToPreset);
}
if (captureButton) {
  captureButton.addEventListener("click", captureViewportPng);
}
if (captureWorldHudButton) {
  captureWorldHudButton.addEventListener("click", captureWorldHudPng);
}
if (paritySnapshotButton) {
  paritySnapshotButton.addEventListener("click", () => {
    void captureParitySnapshotJson();
  });
}
if (debugTabRuntime) {
  debugTabRuntime.addEventListener("click", () => setDebugPanelTab("runtime"));
}
if (debugTabChat) {
  debugTabChat.addEventListener("click", () => setDebugPanelTab("chat"));
}
if (debugChatCopyButton) {
  debugChatCopyButton.addEventListener("click", async () => {
    const ok = await copyTextToClipboard(buildDebugChatLedgerText());
    diagBox.className = ok ? "diag ok" : "diag warn";
    diagBox.textContent = ok
      ? "Copied chat ledger to clipboard."
      : "Failed to copy chat ledger to clipboard.";
  });
}
if (debugChatClearButton) {
  debugChatClearButton.addEventListener("click", () => {
    state.debugChatLedger.length = 0;
    renderDebugChatLedgerPanel();
    diagBox.className = "diag ok";
    diagBox.textContent = "Cleared chat ledger history.";
  });
}
setDebugPanelTab("runtime");
