import {
  buildOverlayCellsModel,
  isLegacyPixelTransparent,
  measureActorOcclusionParityModel,
  topInteractiveOverlayAtModel,
  type RenderOverlayCell,
  type RenderOverlayGrid
} from "./render_composition.ts";
import {
  buildBaseTileTableRuntime,
  canvasFromIndexedPixelsRuntime,
  fallbackTileColorRuntime,
  type IndexedPixmapRuntime,
  tilePaletteIndexRuntime
} from "./render/indexed_pixels_runtime.ts";
import {
  drawLegacyContinueArrowRuntime,
  drawU6CompactTextRuntime,
  drawU6MainTextRuntime,
  type LegacyGlyphSpanRuntime,
  type LegacyTextCanvasRuntime,
  measureU6TextWidthRuntime,
  u6GlyphSpanRuntime
} from "./render/legacy_text_render_runtime.ts";
import { U6TileSetRuntime } from "./render/tile_set_runtime.ts";
import {
  createU6AudioRuntime,
  type U6AudioRuntime
} from "./audio/audio_runtime.ts";
import { U6_SFX } from "./audio/sfx_ids_runtime.ts";
import {
  buildAmbientSfxCandidatesRuntime,
  nextAmbientSfxPlaybackPlanRuntime
} from "./audio/ambient_sfx_runtime.ts";
import {
  audioMuteTogglePlanRuntime,
  bindAudioMuteButtonRuntime,
  audioSoundTogglePlanRuntime,
  audioWorldFlagPlanRuntime,
  bootIntroMusicAwaitingGestureRuntime,
  bootIntroMusicPhaseRuntime,
  canonicalMusicPhasePlanRuntime,
  renderAudioMuteButtonRuntime,
  startupMenuMusicPhaseRuntime
} from "./audio/audio_ui_runtime.ts";
import {
  decodeLegacyPixmapRuntime,
  decodeLookLzdEntriesRuntime
} from "./assets/legacy_pixmap_runtime.ts";
import {
  REQUIRED_RUNTIME_ASSET_NAMES,
  RUNTIME_ASSET_FETCH_MANIFEST,
  missingRequiredRuntimeAssetsRuntime
} from "./assets/runtime_asset_manifest.ts";
import {
  conversationArchiveDiagRuntime,
  runtimeAssetFallbackDiagRuntime,
  runtimeAssetStatusTextRuntime
} from "./assets/runtime_asset_status.ts";
import { decodeRuntimeTileflagSlicesRuntime } from "./assets/runtime_asset_tileflags.ts";
import {
  decodePortraitFromArchiveRuntime,
  decodeU6CursorPtrRuntime,
  decodeU6ShapeFromBufferRuntime,
  decodeU6ShpArchiveRuntime,
  type U6ShapeRuntime
} from "./assets/shape_archive_runtime.ts";
import {
  buildPackedIntroPalettesRuntime,
  buildPaletteFromU6PalRuntime,
  type RgbPaletteRuntime,
  buildStartupPaletteForMenuRuntime
} from "./assets/palette_runtime.ts";
import {
  animationTickForStateRuntime,
  renderPaletteForStateRuntime,
  renderPaletteKeyRuntime,
  resolveAnimatedObjectTileAtTickRuntime,
  resolveAnimatedTileAtTickRuntime,
  resolveFootprintObjectTileRuntime,
  type AnimatedTileObjectRuntime,
  type AnimationPaletteStateRuntime
} from "./render/animation_palette_runtime.ts";
import { errorMessageRuntime } from "./error_runtime.ts";
import { buildUiProbeContract, uiProbeDigest } from "./ui_probe_contract.ts";
import {
  buildConversationVmContext as buildConversationVmContextImported,
  conversationKeyMatchesInput as conversationKeyMatchesInputImported,
  conversationMacroSymbolToIndex as conversationMacroSymbolToIndexImported,
  conversationWordMatchesPattern as conversationWordMatchesPatternImported,
  renderConversationMacrosWithContext as renderConversationMacrosWithContextImported,
  splitConversationInputWords as splitConversationInputWordsImported,
  type ConversationVmContext as ConversationVmContextRuntime
} from "./conversation/text_runtime.ts";
import {
  decodeConversationOpeningLines as decodeConversationOpeningLinesImported,
  decodeConversationOpeningResult as decodeConversationOpeningResultImported,
  decodeConversationResponseBytes as decodeConversationResponseBytesImported,
  decodeConversationResponseOpcodeAware as decodeConversationResponseOpcodeAwareImported,
  type ConversationDecodeOptionsRuntime,
  type ConversationDecodeResultRuntime
} from "./conversation/vm_runtime.ts";
import {
  findConversationFirstKeyPc as findConversationFirstKeyPcImported,
  parseConversationRules as parseConversationRulesImported,
  type ConversationRule
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
  beginLegacyConversationSession,
  buildDebugChatLedgerText as buildDebugChatLedgerTextImported,
  endLegacyConversation as endLegacyConversationImported,
  handleLegacyConversationKeydown as handleLegacyConversationKeydownImported,
  legacyConversationEndedDiagRuntime,
  legacyLedgerPaginationOptionsRuntime,
  legacyLedgerPushOptionsRuntime,
  legacyConversationOkDiagRuntime,
  legacyConversationReplyFailedDiagRuntime,
  paginateLedgerMessages as paginateLedgerMessagesImported,
  pushLedgerMessage as pushLedgerMessageImported,
  showLegacyLedgerPrompt as showLegacyLedgerPromptImported,
  startLegacyConversationPagination as startLegacyConversationPaginationImported,
  submitLegacyConversationInput as submitLegacyConversationInputImported,
  type DebugChatLedgerEntry,
  type LegacyConversationState,
  wrapLegacyLedgerLines as wrapLegacyLedgerLinesImported
} from "./conversation/session_runtime.ts";
import {
  canonicalConversationHintIdFromSpeakerRuntime,
  conversationHeaderIsPlausibleCanonicalFallbackRuntime,
  conversationHeaderMatchesExpectedCanonicalDescRuntime,
  conversationHeaderMatchesExpectedCanonicalNameRuntime,
  decompressU6LzwRuntime,
  isLikelyValidConversationScriptRuntime,
  loadLegacyConversationScriptForNpcRuntime,
  parseConversationHeaderAndDescRuntime
} from "./conversation/archive_runtime.ts";
import {
  conversationArchiveCandidatePathsRuntime as conversationArchiveCandidatePaths,
  fetchConversationArchiveAnyRuntime as fetchConversationArchiveAny,
  fetchConversationArchiveAWithValidationRuntime as fetchConversationArchiveAWithValidation,
  fetchRuntimeAssetWithFallbackRuntime as fetchRuntimeAssetWithFallback,
  looksLikeConversationArchiveRuntime as looksLikeConversationArchive,
  validateConversationArchiveARuntime as validateConversationArchiveA
} from "./conversation/archive_loader_runtime.ts";
import {
  RUNTIME_PROFILE_CANONICAL_STRICT,
  createDefaultRuntimeExtensions,
  runtimeExtensionsSummary
} from "../common/runtime_contract.ts";
import {
  coordUseOfStatus
} from "../common/u6_object_constants.ts";
import {
  managedNetRequestOptionsRuntime,
  performManagedNetRequest,
  type NetJsonBody
} from "./net/request_runtime.ts";
import { applyNetLoginState, clearNetSessionState } from "./net/session_runtime.ts";
import {
  bindRemoteSnapshotButtonRuntime,
  performNetAutosaveSnapshotRuntime,
  performNetLoadSnapshot,
  performNetSaveSnapshot,
  remoteSnapshotLoadedDiagRuntime,
  remoteSnapshotLoadFailureRuntime,
  remoteSnapshotSavedDiagRuntime,
  remoteSnapshotSaveFailureRuntime,
  shouldAutosaveSnapshotRuntime,
  snapshotRouteForCharacterRuntime,
  snapshotSavedTickRuntime,
  type SnapshotSaveDeps,
  type SnapshotRuntimePayload
} from "./net/snapshot_runtime.ts";
import {
  performNetChangePassword,
  performNetRecoverPassword,
  performNetSendEmailVerification,
  performNetSetEmail,
  performNetVerifyEmail
} from "./net/account_runtime.ts";
import {
  applyAuthoritativeNpcStatesRuntime,
  applyAuthoritativeWorldClockToSim,
  authoritativeWorldClockExtrasRuntime,
  authoritativeNpcStateRowsFromJsonRuntime,
  createPresenceSessionIdRuntime,
  performPresenceHeartbeat,
  performPresenceLeave,
  performPresencePoll,
  performWorldClockPoll,
  presenceHeartbeatPayloadRuntime,
  type RemotePresencePlayer,
  type WorldClockPayload
} from "./net/presence_runtime.ts";
import {
  applyHiddenWorldObjectsMetaToClientRuntime,
  applyInventoryProjectionFromServerObjectsRuntime,
  applyTakeProjectionToInventoryRuntime,
  bindCriticalMaintenanceButtonRuntime,
  bindIntroPhaseButtonRuntime,
  clearObjectTransientStateRuntime,
  collectWorldItemsForMaintenanceFromLayer,
  criticalMaintenanceDiagRuntime,
  criticalMaintenanceFailureRuntime,
  hiddenWorldObjectVisibilityForClientRuntime,
  inventoryDisplayEntriesFromObjectsRuntime,
  inventoryCountMapForDropValidationRuntime,
  inventoryObjectForDropSelectionRuntime,
  inventorySyncFailureDiagRuntime,
  markHiddenWorldObjectClientStateRuntime,
  requestIntroPhaseRuntime,
  requestTakeWorldObjectRuntime,
  requestWorldObjectsAroundRuntime,
  removeHiddenWorldObjectsFromLayerRuntime,
  runCriticalMaintenanceRuntime,
  requestWorldObjectsAtCell,
  serverObjectKeyForWorldObjectRuntime,
  setIntroPhaseRuntime,
  shouldHideServerWorldObjectFromLayerRuntime,
  takeProjectionFromResponseRuntime,
  type CriticalMaintenanceEvent,
  type CriticalMaintenanceWorldItem,
  type WorldRuntimeJson,
  type WorldRuntimeDropThrowEffect,
  type WorldRuntimeInventoryObject,
  type WorldRuntimeServerObject
} from "./net/world_runtime.ts";
import {
  performNetDropInventoryObjectRuntime,
  performNetGetAtCellRuntime
} from "./net/world_interaction_runtime.ts";
import {
  objectLayerProjectionActionsFromServerObjectsRuntime,
} from "./net/world_object_projection_runtime.ts";
import { performNetEnsureCharacter } from "./net/character_runtime.ts";
import { performNetLogoutSequence } from "./net/logout_runtime.ts";
import {
  bindNetLoginButtonRuntime,
  netAutoLoginFailureRuntime,
  netAutoLoginSuccessDiagRuntime,
  performNetLoginFlow
} from "./net/auth_runtime.ts";
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
  upsertNetProfileFromControlsRuntime,
  type NetProfile
} from "./net/profile_runtime.ts";
import {
  decodeSimSnapshotBase64Runtime,
  encodeSimSnapshotBase64Runtime,
  type SimSnapshotRuntime
} from "./net/snapshot_codec_runtime.ts";
import {
  applyNetPanelInitialStateRuntime,
  bindNetPanelModalButtonsRuntime,
  loadNetPanelPrefs,
  persistNetLoginSettings,
  setModalOpenRuntime
} from "./net/panel_runtime.ts";
import {
  applySelectedAccountProfileRuntime,
  applyNetPanelPrefsToControlsRuntime,
  bindAccountProfileSelectionRuntime,
  bindNetPanelPrefPersistenceRuntime
} from "./net/panel_bindings_runtime.ts";
import {
  bindNetPanelActionButtonRuntime,
  netPanelActionDiagRuntime,
} from "./net/panel_actions_runtime.ts";
import {
  applyNetStatusPresentationRuntime,
  applyNetStatusRuntime,
  brokenServerGameplayBlockDiagRuntime,
  clearTransientReconnectMessageOnCommandRuntime,
  currentInGameServerStatusOverlayRuntime,
  deriveNetOnlineStatusTextRuntime,
  markServerReconnectedStateRuntime,
  netStatusAutoLoginRuntime,
  netStatusChooseAccountRuntime,
  netStatusNotLoggedInRuntime,
  netStatusSessionExpiredRuntime,
  netLogoutDiagRuntime,
  performReconnectProbeRuntime,
  pulseNetIndicatorRuntime,
  renderCriticalRecoveryStatRuntime,
  renderIntroPhaseUiRuntime,
  renderNetSessionUiRuntime,
  renderNetStatusViewRuntime,
  shouldProbeReconnectRuntime,
  shouldShowInGameServerBrokenRuntime,
  type NetSessionUiElementsRuntime
} from "./net/status_runtime.ts";
import {
  initRuntimeProfileConfigRuntime
} from "./net/runtime_profile_config_runtime.ts";
import {
  legacyAttackVerbRuntime,
  legacyCastVerbRuntime,
  legacyDropVerbRuntime,
  legacyDropVerbValidationRuntime,
  legacyMoveVerbRuntime,
  legacyVerbSfxIdRuntime
} from "./gameplay/legacy_verb_runtime.ts";
import { specialUseSfxAtCellRuntime } from "./gameplay/special_interaction_runtime.ts";
import {
  clampI32Runtime
} from "./sim/sim_utils_runtime.ts";
import {
  asU32SignedRuntime,
  hashHexRuntime,
  hashMixU32Runtime,
  simStateHashRuntime
} from "./sim/hash_runtime.ts";
import { timeOfDayLabelRuntime } from "./sim/time_runtime.ts";
import {
  applySimCommandActionPlanRuntime,
  filterFutureCommandsOfTypeRuntime,
  moveDeltaFromKeyRuntime,
  queueAvatarMoveCommandRuntime,
  queueCellCommandRuntime,
  queueFacingUseCommandRuntime,
  queueLegacyTargetVerbCommandRuntime,
  resetMoveInputThrottleRuntime,
  simCommandActionRuntime,
  type MoveDeltaRuntime,
  type SimCommandRuntime
} from "./sim/queue_runtime.ts";
import {
  advanceSimTickRuntime,
  applyPauseLoopStateRuntime,
  bindBrowserLifecycleRuntime,
  bindPauseLoopButtonRuntime,
  createInitialAppSimState,
  frameLoopRecoveryRuntime,
  loadedSimSnapshotPatchRuntime,
  loopFrameTimingPatchRuntime,
  loopVisibilityResetPatchRuntime,
  pauseLoopReasonDiagRuntime,
  renderPauseLoopUiRuntime,
  resetRunPatchRuntime,
  returnToTitlePatchRuntime,
  returnToTitleSaveFailureRuntime,
  runtimeAssetFallbackPatchRuntime,
  startSessionPatchRuntime,
  type AppSimState,
  type LoopHealthRuntime
} from "./sim/app_state_runtime.ts";
import {
  applyAvatarMoveCommandRuntime,
  avatarMoveAnimationPatchRuntime,
  avatarWalkPresentationActiveRuntime,
  countQueuedAvatarMoveCommandsRuntime
} from "./sim/avatar_move_runtime.ts";
import { U6AnimDataRuntime } from "./sim/anim_data_runtime.ts";
import {
  U6EntityLayerRuntime,
  type U6EntityEntryRuntime
} from "./sim/entity_layer_runtime.ts";
import {
  fetchObjectBaselineVersionRuntime,
  loadPristineObjectBaselineRuntime,
  pristineBaselineReloadedDiagRuntime,
  pristineBaselineReloadFailedDiagRuntime,
  type ObjectBaselineLoadResultRuntime
} from "./sim/object_baseline_runtime.ts";
import { U6MapRuntime } from "./sim/map_runtime.ts";
import {
  LEGACY_COMMAND_TYPE_RUNTIME,
  LEGACY_TARGET_VERB_LABEL_RUNTIME,
  LEGACY_TARGET_VERB_RUNTIME,
  legacyKeyboardCommandActionRuntime,
  legacyNonTargetCommandPatchRuntime,
  legacyTargetStartPlanRuntime,
  legacyVerbMouseCursorIndexRuntime,
  legacyVerbWorldCursorTileRuntime
} from "./sim/legacy_command_runtime.ts";
import {
  type U6ObjectLayerRuntime,
  type U6ObjectEntryRuntime,
  objectLayerAnchorKeyRuntime
} from "./sim/object_layer_runtime.ts";
import {
  authoritativeActorWalkingRuntime,
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
  sleepFrameOffsetForBedAtCellRuntime,
  type FurniturePoseObjectRuntime
} from "./sim/furniture_pose_runtime.ts";
import {
  isImplicitSolidObjectTileRuntime,
  objectFootprintTilesRuntime
} from "./sim/object_footprint_runtime.ts";
import { isBlockedAtRuntime } from "./sim/collision_runtime.ts";
import {
  facingDoorCellRuntime,
  isDoorFrameOpenRuntime,
  resolveDoorTileIdRuntime,
  resolvedDoorFrameRuntime,
  toggleDoorAtCellRuntime
} from "./sim/door_runtime.ts";
import {
  inventoryKeyForObjectRuntime,
  isObjectRemovedRuntime,
  pickObjectIntoInventoryRuntime,
  resolveObjectByInventoryAnchorRuntime,
  type InventoryObjectRuntime
} from "./sim/inventory_runtime.ts";
import {
  isBedObjectRuntime,
  isChairObjectRuntime,
  isCloseableDoorObjectRuntime,
  isLikelyPickupObjectTypeRuntime,
  isSolidEnvObjectRuntime
} from "./sim/object_types_runtime.ts";
import {
  legacyDropAsyncFailurePresentationRuntime,
  legacyGetAsyncFailurePresentationRuntime,
  legacyGetCheckingPresentationRuntime,
  legacyGetFailurePresentationRuntime,
  legacyGetPickedPresentationRuntime,
  legacyLookPresentationRuntime,
  legacyTalkAsyncFailurePresentationRuntime,
  legacyTalkAuthoritativeStartedPresentationRuntime,
  legacyTalkAuthoritativeStartPresentationRuntime,
  legacyTalkFallbackPresentationRuntime,
  legacyTalkFailurePresentationRuntime,
  legacyTalkStartedPresentationRuntime,
  legacyGetTerrainDamageTileRuntime,
  legacyGetTileIgnoredRuntime,
  resolveAttackTargetAtCellRuntime,
  resolveLegacyGetSelectionRuntime,
  resolveLookTargetAtCellRuntime,
  resolveTalkTargetAtCellRuntime,
  targetObjectsFromObjectLayerEntriesRuntime,
  type TargetObjectLayerRuntime
} from "./sim/target_runtime.ts";
import {
  activeTargetCursorKeyActionRuntime,
  applyTargetCursorMouseCommitRuntime,
  beginTargetCursorRuntime,
  cancelTargetCursorRuntime,
  clampTargetCursorToViewRuntime,
  commitTargetCursorRuntime,
  moveTargetCursorRuntime,
  targetCursorCancelledDiagRuntime
} from "./sim/target_cursor_runtime.ts";
import {
  BOOT_INTRO_SCENES,
  abortBootIntroRuntime,
  advanceBootIntroInputRuntime,
  advanceBootIntroRuntime,
  activeBootIntroPaletteRuntime,
  bootIntroClipRectRuntime,
  bootIntroCachedCanvasRuntime,
  bootIntroPaletteCacheKeyRuntime,
  bootIntroPrintTextOnCardRuntime,
  bootIntroPrintTextRuntime,
  bootIntroSpriteDrawRectRuntime,
  bootIntroTvStaticDrawCellsRuntime,
  buildBootIntroLayerRenderPlanRuntime,
  buildBootIntroLoungeRenderPlanRuntime,
  buildBootIntroSplashRenderPlanRuntime,
  buildBootIntroStonesRenderPlanRuntime,
  buildBootIntroTextCardRenderPlanRuntime,
  buildBootIntroWindowRenderPlanRuntime,
  bootIntroInputPlanRuntime,
  bootIntroWouCharWidthRuntime,
  decodeBootIntroWouFontRuntime,
  drawBootIntroWouTextRuntime,
  bootIntroOverlayAlphaRuntime,
  createBootIntroRuntimeState,
  currentBootIntroSceneRuntime,
  measureBootIntroTextWidthRuntime,
  resolveBootIntroTextCardPrintOpRuntime,
  startBootIntroRuntime,
  type BootIntroRuntimeState,
  type BootIntroSceneSpec,
  type BootIntroTextCard,
  type BootIntroTextCanvasRuntime,
  type BootIntroWouFontRuntime,
  wrapBootIntroTextPixelsRuntime
} from "./ui/boot_intro_runtime.ts";
import {
  applyStartupMenuIndexRuntime,
  bindSkipIntroPreferenceRuntime,
  buildStartupMenuRenderPlanRuntime,
  buildStartupScreenRenderPlanRuntime,
  journeyOnwardStartedDiagRuntime,
  startupMenuKeyPatchRuntime,
  startupAssetsReadyDiagRuntime,
  startupMenuIndexAtSurfacePointRuntime,
  startupMenuSelectionActionRuntime,
  startupMenuSelectionPresentationRuntime,
  startupCachedCanvasRuntime,
  startupSessionGuardDiagRuntime,
  shouldStartSessionFromSkipIntroRuntime,
  writeSkipIntroPreferenceRuntime
} from "./ui/startup_runtime.ts";
import {
  areaIdForWorldXYRuntime,
  canonicalLookSentenceForTileRuntime,
  canonicalTalkSpeakerForTileRuntime,
  legacyDropTargetPromptLinesRuntime,
  legacyArticleForTileRuntime,
  legacyLookupTileStringRuntime,
  type LegacyLookStringEntryRuntime,
  sanitizeLegacyHudLabelTextRuntime
} from "./ui/legacy_text_runtime.ts";
import {
  applyDebugPanelTabRuntime,
  bindDebugPanelButtonsRuntime,
  clearDebugChatLedgerRuntime,
  debugChatLedgerClearDiagRuntime,
  debugChatLedgerCopyDiagRuntime,
  debugPanelTabModelRuntime,
  renderDebugChatLedgerCountRuntime,
  renderDebugChatLedgerModelRuntime
} from "./ui/debug_panel_runtime.ts";
import {
  cursorCycleRuntime,
  cursorDrawRectRuntime,
  cursorLogicalWidthRuntime,
  cursorShapeSelectionRuntime,
  legacySelectCellMarkerPlanRuntime,
  legacyCursorLayerTargetRuntime
} from "./ui/cursor_runtime.ts";
import {
  applyLegacyCornerVariantRuntime,
  buildBaseTileBuffersRuntime,
  buildLegacyViewContextRuntime,
  legacyHudBackdropRenderPlanRuntime,
  legacyViewportCompositionPlanRuntime,
  shouldBlackoutTileRuntime,
  stableCornerVariantRuntime,
  type LegacyViewContextRuntime
} from "./ui/legacy_view_tile_runtime.ts";
import {
  activeCursorSurfaceRuntime,
  activeGameKeydownPlanRuntime,
  applyCanvasMouseEventRuntime,
  clearCanvasMouseStateRuntime,
  isHoverReportCopyKeyRuntime,
  isTypingContextRuntime,
  isShiftRightClickCopyGestureRuntime,
  legacyHudClickPlanRuntime,
  shouldLetBrowserHandleShortcutRuntime,
  shouldSuppressShiftContextMenuRuntime
} from "./ui/input_runtime.ts";
import {
  canvas2dContextRuntime,
  legacyFrameLayoutModelRuntime,
  requiredElementRuntime
} from "./ui/dom_runtime.ts";
import {
  buildLegacyInventoryPaperdollLayoutRuntime,
  legacyInventoryPaperdollHitTestFromProbeRuntime,
  legacyInventoryPaperdollHitTestRuntime,
  type LegacyHudPanelHitRuntime
} from "./ui/inventory_paperdoll_layout_runtime.ts";
import {
  legacyEquipmentSlotsForTalkActorRuntime,
  projectLegacyEquipmentSlotsRuntime
} from "./ui/paperdoll_equipment_runtime.ts";
import {
  normalizePartyMemberIdsRuntime,
  partySwitchDigitDiagRuntime,
  resolvePartySwitchDigitRuntime
} from "./ui/party_message_runtime.ts";
import {
  buildCharacterPanelRenderPlanRuntime,
  CHARACTER_PANEL_SLOTS_RUNTIME,
  projectCharacterPanelPicksRuntime,
  type CharacterPanelEntityRuntime
} from "./ui/character_panel_runtime.ts";
import {
  applyBooleanTogglePreferenceStateRuntime,
  applyAnimationModePreferenceStateRuntime,
  applyFontPreferenceRuntime,
  applyLegacyFramePreviewPreferenceRuntime,
  applyLegacyScaleModePreferenceStateRuntime,
  applyMovementModePreferenceStateRuntime,
  applyPaletteFxPreferenceStateRuntime,
  applyThemePreferenceRuntime,
  initChoicePreferenceRuntime,
  initPreferenceControlsRuntime,
  nextLegacyScaleModeRuntime,
} from "./ui/preference_runtime.ts";
import {
  DEFAULT_PANEL_COPY_VALUE_IDS_RUNTIME,
  copyTextToClipboardRuntime,
  copyTextToClipboardSyncRuntime,
  installPanelCopyButtonsRuntime,
  makeCopyButtonRuntime,
  setCopyPendingStatusRuntime,
  setCopyStatusRuntime
} from "./ui/clipboard_runtime.ts";
import {
  buildParitySnapshotCellsRuntime,
  buildParitySnapshotRuntime,
  clampParityRadiusRuntime,
  paritySnapshotCopyResultRuntime,
  paritySnapshotUnavailableDiagRuntime,
  paritySnapshotWindowRuntime
} from "./ui/parity_snapshot_runtime.ts";
import {
  downloadCanvasPngRuntime,
  downloadJsonFileRuntime
} from "./ui/download_runtime.ts";
import {
  dropThrowRenderPlanRuntime,
  queueDropThrowEffectRuntime
} from "./ui/drop_throw_runtime.ts";
import {
  CAPTURE_PRESETS_RUNTIME,
  activeCapturePresetFromSelectRuntime,
  bindCaptureControlButtonsRuntime,
  cameraPresetPatchRuntime,
  captureFilePlanRuntime,
  capturePresetByIdRuntime,
  captureSuccessDiagRuntime,
  captureViewportStatusRowsFromElementsRuntime,
  composeViewportCaptureCanvasRuntime,
  composeWorldHudCaptureCanvasRuntime,
  populateCapturePresetSelectRuntime,
  type CapturePresetRuntime
} from "./ui/capture_runtime.ts";
import {
  applyReplayDownloadDisabledRuntime,
  releaseReplayUrlRuntime,
  replayCommandTicksRuntime,
  replayTotalTicksRuntime,
  replayVerificationResultRuntime,
  runReplayCheckpointsRuntime,
  setReplayCsvRuntime,
  type ReplayCheckpointRuntime
} from "./ui/replay_runtime.ts";
import {
  nextUiProbeModeRuntime,
  normalizeUiProbeModeRuntime,
  buildUiProbeRuntimePayloadRuntime,
  installUiProbeDebugHooksRuntime,
  uiProbeCapturePresentationRuntime,
  uiProbeFilenameRuntime,
  uiProbeModePresentationRuntime
} from "./ui/probe_runtime.ts";
import {
  debugHotkeyActionRuntime,
  legacyHudHitDiagRuntime,
  legacyHudLayerDiagRuntime,
  netLoginHotkeyFailedDiagRuntime,
  netLoginHotkeyOkDiagRuntime,
  runDebugHotkeyActionRuntime,
  toggleHelpPanelRuntime,
  versionStringHotkeyDiagRuntime,
  worldSnapshotLoadFailedHotkeyDiagRuntime,
  worldSnapshotLoadedHotkeyDiagRuntime,
  worldSnapshotSaveFailedHotkeyDiagRuntime,
  worldSnapshotSavedHotkeyDiagRuntime
} from "./ui/hotkey_runtime.ts";
import {
  buildHoverReportTextRuntime,
  applyHoverReportCopyResultRuntime,
  hexRuntime,
  hoverReportCopyResultRuntime,
  hoverReportUnavailableResultRuntime,
  hoveredOrFallbackWorldCellRuntime,
  hoveredWorldCellRuntime,
  serverWorldObjectsHoverTextRuntime
} from "./ui/hover_report_runtime.ts";
import {
  applyDiagPresentationRuntime,
  applyStatusPanelTextRuntime,
  buildStatusPanelTextRuntime,
  formatLedgerEntryCountRuntime,
  normalizeDiagKindPresentationRuntime,
  drawServerStatusOverlayRuntime,
  serverStatusOverlaySurfacePlansRuntime
} from "./ui/status_text_runtime.ts";

const TICK_MS = 100;
const LEGACY_PROMPT_FRAME_MS = 120;
const TILE_SIZE = 64;
const VIEW_W = 11;
const VIEW_H = 11;
const COMMAND_LOG_MAX = 50000;
const MOVE_INPUT_MIN_INTERVAL_MS = 120;
const AVATAR_WALK_ANIM_WINDOW_MS = 280;
const NET_PRESENCE_HEARTBEAT_TICKS = 4;
const NET_PRESENCE_POLL_TICKS = 10;
const NET_CLOCK_POLL_TICKS = 2;
const NET_AUTOSAVE_TICKS = NET_PRESENCE_HEARTBEAT_TICKS * 15;
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
const DEFAULT_PICKUP_RESPAWN_MS_RUNTIME = 10 * 60 * 1000;
const DROP_THROW_EFFECT_MS = 360;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 28;
const MONTHS_PER_YEAR = 13;
const REPLAY_CHECKPOINT_INTERVAL = 32;
const ENTITY_TYPE_ACTOR_MIN = 0x153;
const ENTITY_TYPE_ACTOR_MAX = 0x1af;
const AVATAR_ENTITY_ID = 1;
const LEGACY_SLEEP_SHAPE_TYPE = 0x092;
const NPC_FLAG_DIRECTION_MASK = 0x07;
const NPC_FLAG_WALKING = 0x80;
const OBJECT_TYPES_FLOOR_DECOR = new Set([0x12e, 0x12f, 0x130]);

const HASH_OFFSET = 1469598103934665603n;
const HASH_PRIME = 1099511628211n;
const HASH_MASK = (1n << 64n) - 1n;
const HASH_CFG = { offset: HASH_OFFSET, prime: HASH_PRIME, mask: HASH_MASK };
const FALLBACK_RENDER_PALETTE: RgbPaletteRuntime = Array.from(
  { length: 256 },
  (_unused, idx) => fallbackTileColorRuntime(idx)
);
const WORLD_OBJECT_LOOKUP_DEPS = {
  isObjectRemoved: isObjectRemovedRuntime,
  isLikelyPickupObjectType: (type: number) => isLikelyPickupObjectTypeRuntime(type, state.typeWeights)
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
  __vmCaptureUiProbe?: () => { digest: string; probe: UiProbeContractRuntime };
  __vmGetUiProbe?: () => UiProbeContractRuntime;
  __vmLastUiProbe?: UiProbeContractRuntime;
  __vmLastUiProbeDigest?: string;
  __vmStartSessionFromTitle?: () => void;
};
type U6TextCanvasApp = LegacyTextCanvasRuntime | {
  fillStyle?: unknown;
  fillRect(x: number, y: number, w: number, h: number): void;
};
type AnimationPaletteState = AnimationPaletteStateRuntime;
type AnimatedTileObject = AnimatedTileObjectRuntime;
type LegacyTalkActor = {
  baseTile?: number;
  frame?: number;
  id?: number;
  type?: number;
  x?: number;
  y?: number;
  z?: number;
};
type LegacyConversationActor = LegacyTalkActor & {
  qual?: number;
};
type LegacyConversationHeader = ReturnType<typeof parseConversationHeaderAndDescRuntime>;
type LegacyConversationResolution = {
  objNum: number;
  script: Uint8Array | null;
  header: LegacyConversationHeader;
  valid: boolean;
};
type LegacyConversationVmOverrides = {
  targetName?: unknown;
  greeting?: unknown;
  objNum?: unknown;
};
type AuthoritativeConversationPayload = {
  conversation_session?: {
    desc?: unknown;
    next_pc?: unknown;
    npc_id?: unknown;
    opening_lines?: unknown;
    session_id?: unknown;
    stop_opcode?: unknown;
    target_name?: unknown;
  };
};
type LegacyConversationStateView = {
  converseArchiveA: Uint8Array | null;
  converseArchiveB: Uint8Array | null;
  converseArchiveDiag: string | null;
  legacyConversationDescText: string | null;
  legacyConversationInputOpcode: number;
  legacyConversationPc: number;
  legacyConversationRules: ConversationRule[];
  legacyConversationScript: Uint8Array | null;
  legacyConversationTargetName: string | null;
  legacyConversationVmContext: ConversationVmContextRuntime | null;
};
type LegacyTalkSessionStateView = LegacyConversationStateView & {
  converseArchiveA: Uint8Array | null;
  converseArchiveB: Uint8Array | null;
  entityLayer: U6EntityLayerRuntime | null;
  legacyConversationActive: boolean;
  legacyConversationActorEntityId: number;
  legacyConversationAuthoritative: boolean;
  legacyConversationEquipmentSlots: ReturnType<typeof projectLegacyEquipmentSlotsRuntime>;
  legacyConversationInput: string;
  legacyConversationKnownNames: Record<string, string>;
  legacyConversationNpcKey: string;
  legacyConversationPendingPrompt: string;
  legacyConversationPortraitTile: number;
  legacyConversationPrevStatus: number;
  legacyConversationSessionId: string;
  legacyConversationShowInventory: boolean;
  legacyConversationTargetObjNum: number;
  legacyConversationTargetObjType: number;
  legacyStatusDisplay: number;
  mapCtx: U6MapRuntime | null;
  objectLayer: TargetObjectLayerRuntime | null;
};
type AppObjectLayerStateView = {
  entityLayer: U6EntityLayerRuntime | null;
  objectLayer: U6ObjectLayerRuntime | null;
};
type AppPresenceStateView = AppObjectLayerStateView & {
  net: {
    clockPollInFlight: boolean;
    presencePollInFlight: boolean;
    remotePlayers: RemotePresencePlayer[];
  };
};
type GameplayInteractionStateView = {
  entityLayer: U6EntityLayerRuntime | null;
  mapCtx: U6MapRuntime | null;
  objectLayer: U6ObjectLayerRuntime | null;
  queue: SimCommandRuntime[];
  sim: AppSimState;
  terrainType: Uint8Array | null;
  tileFlags: Uint8Array | null;
};

type ObjectFootprintSourceRuntime = FurniturePoseObjectRuntime & {
  renderable?: boolean;
};
type LegacyPortraitEntry = {
  archive: "a" | "b";
  index: number;
};
type LegacyConversationPanelPortraitProbe = {
  target_name?: unknown;
  target_obj_num?: unknown;
  target_obj_type?: unknown;
};
type LegacyPortraitStateView = {
  avatarPortraitCanvas: HTMLCanvasElement | null;
  basePalette: RgbPaletteRuntime | null;
  legacyConversationTargetObjNum: number | null;
  legacyConversationTargetObjType: number | null;
  portraitArchiveA: Uint8Array | null;
  portraitArchiveB: Uint8Array | null;
  portraitCanvasCache: Map<string, HTMLCanvasElement>;
};
type LegacyPanelSlotEntry = {
  key?: unknown;
  slot?: unknown;
  tile_hex?: unknown;
};
type LegacyInventoryDisplayEntry = {
  key: string;
  count: number;
  inventory_key?: string;
  object_key?: string;
  stackable?: boolean;
  tile_hex?: unknown;
};
type LegacyBackdropRenderStateView = {
  basePalette: RgbPaletteRuntime | null;
  legacyBackdropBaseCanvas: HTMLCanvasElement | null;
  legacyConversationEquipmentSlots: LegacyPanelSlotEntry[];
  legacyConversationShowInventory: boolean;
  legacyConversationTargetName: string | null;
  legacyHudLayerHidden: boolean;
  legacyHudSelection: LegacyHudPanelHitRuntime | null;
  legacyPaperPixmap: IndexedPixmapRuntime | null;
  legacyScaleMode: string;
  legacyStatusDisplay: number;
  objectLayer: U6ObjectLayerRuntime | null;
  tileSet: U6TileSetRuntime | null;
};
type StartupMenuRenderStateView = {
  basePalette: RgbPaletteRuntime | null;
  startupCanvasCache: Map<string, HTMLCanvasElement | null>;
  startupMenuIndex: number;
  startupMenuPixmap: IndexedPixmapRuntime | null;
  startupTitlePixmaps: [IndexedPixmapRuntime | null, IndexedPixmapRuntime | null] | null;
  tileSet: U6TileSetRuntime | null;
};
type BootIntroBankName = "intro1" | "intro2" | "intro3";
type BootIntroRenderStateView = {
  basePalette: RgbPaletteRuntime | null;
  bootIntro: BootIntroRuntimeState | null;
  bootIntroBanks: Partial<Record<BootIntroBankName, Array<IndexedPixmapRuntime | null>>> | null;
  bootIntroBlocks: Array<IndexedPixmapRuntime | null> | null;
  bootIntroCanvasCache: Map<string, HTMLCanvasElement | null>;
  bootIntroFont: BootIntroWouFontRuntime | null;
  bootIntroPalettes: RgbPaletteRuntime[] | null;
};
type CursorDrawOptions = {
  logicalW?: number;
  mouseX?: number;
  mouseY?: number;
};
type LegacyCompositionStateView = {
  basePalette: RgbPaletteRuntime | null;
  cursorIndex: number;
  cursorPixmaps: U6ShapeRuntime[] | null;
  legacyBackdropBaseCanvas: HTMLCanvasElement | null;
  legacyComposeCanvas: HTMLCanvasElement | null;
  mouseInCanvas: boolean;
  mouseNormX: number;
  mouseNormY: number;
  sessionStarted: boolean;
  tileSet: U6TileSetRuntime | null;
};
type AppLoopHealthState = LoopHealthRuntime;
type AppNetState = {
  apiBase: string;
  backgroundFailCount: number;
  backgroundSyncPaused: boolean;
  characterId: string;
  characterName: string;
  clockPollInFlight: boolean;
  email: string;
  emailVerified: boolean;
  firstBackgroundFailAtMs: number;
  introPhase: string;
  lastClockPollTick: number;
  lastMaintenanceTick: number;
  lastPresenceHeartbeatTick: number;
  lastPresencePollTick: number;
  lastSavedTick: number;
  hiddenWorldObjectKeys: Record<string, number>;
  maintenanceAuto: boolean;
  maintenanceInFlight: boolean;
  presencePollInFlight: boolean;
  recoveryEventCount: number;
  remotePlayers: RemotePresencePlayer[];
  resumeFromSnapshot: boolean;
  sessionId: string;
  snapshotSaveInFlight: boolean;
  statusLevel: string;
  statusText: string;
  token: string;
  userId: string;
  username: string;
};
type AppState = {
  accMs: number;
  animData: U6AnimDataRuntime | null;
  animationFrozen: boolean;
  audio: U6AudioRuntime;
  audioAmbientLastSfx: string;
  audioAmbientLastTickBySfx: Record<string, number>;
  audioAmbientTriggerCount: number;
  avatarFacingDx: number;
  avatarFacingDy: number;
  avatarFrameSeed: number;
  avatarLastMoveTick: number;
  avatarPortraitCanvas: HTMLCanvasElement | null;
  avatarWalkAnimUntilMs: number;
  basePalette: RgbPaletteRuntime | null;
  bootIntro: BootIntroRuntimeState;
  bootIntroBanks: Partial<Record<BootIntroBankName, Array<IndexedPixmapRuntime | null>>> | null;
  bootIntroBlocks: Array<IndexedPixmapRuntime | null> | null;
  bootIntroCanvasCache: Map<string, HTMLCanvasElement | null>;
  bootIntroFont: BootIntroWouFontRuntime | null;
  bootIntroPalettes: RgbPaletteRuntime[] | null;
  centerAnimatedTile: number;
  centerPaletteBand: string;
  centerRawTile: number;
  commandLog: SimCommandRuntime[];
  converseArchiveA: Uint8Array | null;
  converseArchiveB: Uint8Array | null;
  converseArchiveDiag: string;
  cornerVariantCache: Map<string, number>;
  cursorIndex: number;
  cursorPixmaps: U6ShapeRuntime[] | null;
  debugChatLedger: DebugChatLedgerEntry[];
  debugPanelTab: "runtime" | "chat";
  dropThrowEffects: DropThrowEffectRuntime[];
  enablePaletteFx: boolean;
  entityLayer: U6EntityLayerRuntime | null;
  entityOverlayCount: number;
  frozenAnimationTick: number | null;
  interactionProbeTile: number | null;
  lastMoveInputDx: number;
  lastMoveInputDy: number;
  lastMoveQueueAtMs: number;
  lastTs: number;
  legacyBackdropBaseCanvas: HTMLCanvasElement | null;
  legacyCombatModeLabel: string;
  legacyComposeCanvas: HTMLCanvasElement | null;
  legacyConversationActive: boolean;
  legacyConversationActorEntityId: number;
  legacyConversationAuthoritative: boolean;
  legacyConversationDescText: string;
  legacyConversationEquipmentSlots: ReturnType<typeof projectLegacyEquipmentSlotsRuntime>;
  legacyConversationInput: string;
  legacyConversationInputOpcode: number;
  legacyConversationKnownNames: Record<string, string>;
  legacyConversationNpcKey: string;
  legacyConversationPages: string[][];
  legacyConversationPaging: boolean;
  legacyConversationPc: number;
  legacyConversationPendingPrompt: string;
  legacyConversationPortraitTile: number | null;
  legacyConversationPrevStatus: number;
  legacyConversationRules: ConversationRule[];
  legacyConversationScript: Uint8Array | null;
  legacyConversationSessionId: string;
  legacyConversationShowInventory: boolean;
  legacyConversationTargetName: string;
  legacyConversationTargetObjNum: number;
  legacyConversationTargetObjType: number;
  legacyConversationVmContext: ConversationVmContextRuntime | null;
  legacyHudLayerHidden: boolean;
  legacyHudSelection: LegacyHudPanelHitRuntime | null;
  legacyLedgerLines: string[];
  legacyLedgerPrompt: boolean;
  legacyPaperPixmap: IndexedPixmapRuntime | null;
  legacyPromptAnimMs: number;
  legacyPromptAnimPhase: number;
  legacyScaleMode: string;
  legacyStatusDisplay: number;
  lookStringEntries: LegacyLookStringEntryRuntime[] | null;
  loopHealth: AppLoopHealthState;
  mapCtx: U6MapRuntime | null;
  mouseInCanvas: boolean;
  mouseNormX: number;
  mouseNormY: number;
  movementMode: string;
  musicPhase: string;
  musicSong: string;
  net: AppNetState;
  npcOcclusionBlockedMoves: number;
  objectLayer: U6ObjectLayerRuntime | null;
  objectOverlayCount: number;
  palette: RgbPaletteRuntime | null;
  paletteFrame: RgbPaletteRuntime | null;
  paletteFrameTick: number;
  partyNameById: Record<string, string>;
  portraitArchiveA: Uint8Array | null;
  portraitArchiveB: Uint8Array | null;
  portraitCanvasCache: Map<string, HTMLCanvasElement>;
  pristineBaselineLastPollTick: number;
  pristineBaselinePollInFlight: boolean;
  pristineBaselineVersion: string;
  queue: SimCommandRuntime[];
  renderParityMismatches: number;
  replayUrl: string | null;
  reconnectedMessageClearOnCommand: boolean;
  reconnectedMessageUntilMs: number;
  reconnectProbeInFlight: boolean;
  reconnectProbeLastMs: number;
  runtimeExtensions: ReturnType<typeof createDefaultRuntimeExtensions>;
  runtimeProfile: string;
  runtimeReady: boolean;
  sessionStarted: boolean;
  showGrid: boolean;
  showOverlayDebug: boolean;
  sim: AppSimState;
  simPaused: boolean;
  startupCanvasCache: Map<string, HTMLCanvasElement | null>;
  startupMenuIndex: number;
  startupMenuPixmap: IndexedPixmapRuntime | null;
  startupTitlePixmaps: [IndexedPixmapRuntime | null, IndexedPixmapRuntime | null] | null;
  targetVerb: string;
  terrainType: Uint8Array | null;
  tileFlags: Uint8Array | null;
  tileFlags2: Uint8Array | null;
  typeWeights: Uint8Array | null;
  tileSet: U6TileSetRuntime | null;
  u6MainFont: Uint8Array | null;
  uiProbeMode: string;
  useCursorActive: boolean;
  useCursorX: number;
  useCursorY: number;
};

type DropThrowEffectRuntime = WorldRuntimeDropThrowEffect;

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return requiredElementRuntime<T>(document, id);
}

const canvas = byId<HTMLCanvasElement>("viewport");
const ctx = canvas2dContextRuntime(canvas, "viewport");
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
const skipIntroCheckbox = byId<HTMLInputElement>("skipIntroCheckbox");
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
const netStatusElements: NetSessionUiElementsRuntime = {
  statNetSession,
  topNetStatus,
  topNetIndicator,
  netQuickStatus,
  netLoginButton,
  statIntroPhase,
  netIntroPhaseSelect
};
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
const SKIP_INTRO_KEY = "vm_skip_intro_menu";
const NET_PROFILES_KEY = "vm_net_profiles";
const NET_PROFILE_SELECTED_KEY = "vm_net_profile_selected";
const NET_PROFILE_STORAGE = {
  storageKey: NET_PROFILES_KEY,
  selectedKeyStorageKey: NET_PROFILE_SELECTED_KEY
};
const RUNTIME_PROFILE_KEY = "vm_runtime_profile";
const RUNTIME_EXTENSIONS_KEY = "vm_runtime_extensions";
const NET_ACTIVITY_PULSE_MS = 280;
const NET_RECONNECT_PROBE_INTERVAL_MS = 1000;
const NET_RECONNECTED_MESSAGE_MS = 3200;
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
type StartupMenuItem = {
  enabled: boolean;
  id: string;
  label: string;
};
const STARTUP_MENU: readonly StartupMenuItem[] = Object.freeze([
  { id: "intro", label: "Introduction", enabled: false },
  { id: "create", label: "Create Character", enabled: false },
  { id: "transfer", label: "Transfer Character", enabled: false },
  { id: "ack", label: "Acknowledgements", enabled: false },
  { id: "journey", label: "Journey Onward", enabled: true }
]);
const LEGACY_TARGET_VERB_LABEL = LEGACY_TARGET_VERB_LABEL_RUNTIME;
const LEGACY_STATUS_DISPLAY = Object.freeze({
  CMD_90: 0x90, /* character status */
  CMD_91: 0x91, /* party list / command */
  CMD_92: 0x92, /* equipment + inventory */
  CMD_9E: 0x9e  /* inspect / talk panel */
});
const LEGACY_COMMAND_TYPE = LEGACY_COMMAND_TYPE_RUNTIME;
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
const LEGACY_GENERIC_PORTRAIT_BY_TYPE: Readonly<Record<number, number>> = Object.freeze({
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
const INITIAL_NET_STATUS = netStatusNotLoggedInRuntime();

const state: AppState = {
  sim: createInitialAppSimState(INITIAL_WORLD, INITIAL_SEED),
  audio: createU6AudioRuntime(),
  musicPhase: "",
  musicSong: "",
  audioAmbientLastTickBySfx: {},
  audioAmbientLastSfx: "",
  audioAmbientTriggerCount: 0,
  queue: [],
  commandLog: [],
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
  dropThrowEffects: [],
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
  typeWeights: null,
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
  reconnectedMessageClearOnCommand: false,
  reconnectedMessageUntilMs: 0,
  reconnectProbeInFlight: false,
  reconnectProbeLastMs: 0,
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
    sessionId: createPresenceSessionIdRuntime({
      getRandomValues: globalThis.crypto?.getRandomValues?.bind(globalThis.crypto),
      nowMs: () => Date.now(),
      randomUUID: globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
    }),
    characterId: "",
    characterName: "",
    remotePlayers: [],
    lastPresenceHeartbeatTick: -1,
    lastPresencePollTick: -1,
    lastClockPollTick: -1,
    hiddenWorldObjectKeys: {},
    presencePollInFlight: false,
    clockPollInFlight: false,
    backgroundSyncPaused: false,
    backgroundFailCount: 0,
    firstBackgroundFailAtMs: 0,
    lastSavedTick: 0,
    maintenanceAuto: false,
    maintenanceInFlight: false,
    snapshotSaveInFlight: false,
    lastMaintenanceTick: -1,
    recoveryEventCount: 0,
    resumeFromSnapshot: false,
    introPhase: "post_intro",
    statusLevel: INITIAL_NET_STATUS.level,
    statusText: INITIAL_NET_STATUS.text
  }
};

function wrapLegacyLedgerLines(text: unknown): string[] {
  return wrapLegacyLedgerLinesImported(text, LEGACY_LEDGER_MAX_CHARS);
}

function pushLedgerMessage(text: unknown): void {
  pushLedgerMessageImported(state as LegacyConversationState, text, legacyLedgerPushOptionsRuntime({
    maxChars: LEGACY_LEDGER_MAX_CHARS,
    maxLines: LEGACY_LEDGER_MAX_LINES,
    tick: Number(state.sim?.tick) >>> 0,
    nowMs: Date.now()
  }));
}

function renderDebugChatLedgerPanel(): void {
  renderDebugChatLedgerModelRuntime({
    ledger: state.debugChatLedger,
    countFormatter: formatLedgerEntryCountRuntime,
    buildLedgerText: buildDebugChatLedgerTextImported,
    elements: {
      count: debugChatCount,
      ledgerBody: debugChatLedgerBody
    }
  });
}

function setDebugPanelTab(tab: unknown): void {
  const model = debugPanelTabModelRuntime(tab);
  state.debugPanelTab = model.tab;
  applyDebugPanelTabRuntime(model, {
    chatPanel: debugPanelChat,
    chatTab: debugTabChat,
    runtimePanel: debugPanelRuntime,
    runtimeTab: debugTabRuntime
  });
  if (model.refreshChatLedger) {
    renderDebugChatLedgerPanel();
  }
}

function paginateLedgerMessages(lines: unknown, maxLines = LEGACY_LEDGER_MAX_LINES - 1): string[][] {
  return paginateLedgerMessagesImported(lines, maxLines, LEGACY_LEDGER_MAX_CHARS);
}

function startLegacyConversationPagination(lines: unknown): boolean {
  return startLegacyConversationPaginationImported(state as LegacyConversationState, lines, legacyLedgerPaginationOptionsRuntime({
    maxChars: LEGACY_LEDGER_MAX_CHARS,
    maxLines: LEGACY_LEDGER_MAX_LINES,
    tick: Number(state.sim?.tick) >>> 0,
    nowMs: Date.now()
  }));
}

function advanceLegacyConversationPagination(): boolean {
  return advanceLegacyConversationPaginationImported(state as LegacyConversationState, pushLegacyConversationPrompt);
}

function showLegacyLedgerPrompt(): void {
  showLegacyLedgerPromptImported(state as LegacyConversationState);
}

function isLegacyFramePreviewOn(): boolean {
  return document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
}

const LEGACY_SCALE_MODES = Object.freeze(["fit", "1", "2", "3", "4"]);
const CURSOR_ASPECT_X = 1.0;
const CURSOR_ASPECT_Y = 1.2;

function animationTick(): number {
  return animationTickForStateRuntime({
    currentTick: state.sim.tick,
    state: state as AnimationPaletteState
  });
}

function resolveAnimatedTileAtTick(tileId: number, counter: number): number {
  return resolveAnimatedTileAtTickRuntime({
    animData: (state as AnimationPaletteState).animData,
    counter,
    tileId
  });
}

function resolveAnimatedTile(tileId: number): number {
  return resolveAnimatedTileAtTick(tileId, animationTick());
}

function resolveAnimatedObjectTileAtTick(obj: AnimatedTileObject | null | undefined, counter: number): number {
  return resolveAnimatedObjectTileAtTickRuntime({
    animData: (state as AnimationPaletteState).animData,
    counter,
    obj,
    sim: state.sim
  });
}

function resolveAnimatedObjectTile(obj: AnimatedTileObject | null | undefined): number {
  return resolveAnimatedObjectTileAtTick(obj, animationTick());
}

function resolveFootprintObjectTile(obj: AnimatedTileObject | null | undefined): number {
  return resolveFootprintObjectTileRuntime({
    obj,
    sim: state.sim
  });
}

function renderPaletteTick(): number {
  return animationTick();
}

function legacyPalettePhase(): number {
  /* Legacy VGA cycling repeats every 8 steps for the animated bands. */
  return renderPaletteTick() & 0x07;
}

function getRenderPalette(): RgbPaletteRuntime | null {
  return renderPaletteForStateRuntime({
    phase: legacyPalettePhase(),
    state: state as AnimationPaletteState
  });
}

function getRenderPaletteKey(): string {
  return renderPaletteKeyRuntime({
    enablePaletteFx: state.enablePaletteFx,
    phase: legacyPalettePhase()
  });
}

function decompressU6Lzw(bytes: Uint8Array): Uint8Array {
  return decompressU6LzwRuntime(bytes) ?? bytes;
}

function legacyLookupTileString(tileId: number): string {
  return legacyLookupTileStringRuntime(tileId, state.lookStringEntries as LegacyLookStringEntryRuntime[] | null);
}

function legacyArticleForTile(tileId: number): string {
  return legacyArticleForTileRuntime(tileId, state.tileFlags2);
}

function canonicalLookSentenceForTile(tileId: number): string {
  return canonicalLookSentenceForTileRuntime(tileId, state.lookStringEntries as LegacyLookStringEntryRuntime[] | null, state.tileFlags2);
}

function canonicalTalkSpeakerForTile(tileId: number): string {
  return canonicalTalkSpeakerForTileRuntime(tileId, state.lookStringEntries as LegacyLookStringEntryRuntime[] | null, state.tileFlags2);
}

function sanitizeLegacyHudLabelText(text: unknown): string {
  return sanitizeLegacyHudLabelTextRuntime(text);
}

function areaIdForWorldXY(x: unknown, y: unknown): number {
  return areaIdForWorldXYRuntime(x, y);
}

function legacyEquipmentSlotsForTalkActor(actor: LegacyTalkActor | null | undefined): ReturnType<typeof projectLegacyEquipmentSlotsRuntime> {
  /*
    Canonical source first: objlist actor table stores actor-owned/equipped objects.
    Objblk assoc rows are a fallback for baseline/static snapshots.
  */
  const layerState = state as AppObjectLayerStateView;
  return legacyEquipmentSlotsForTalkActorRuntime({
    actor,
    entityAssocEntries: layerState.entityLayer?.assocEntries,
    objectAssocEntries: layerState.objectLayer?.assocEntries
  });
}

function endLegacyConversation(): void {
  endLegacyConversationImported(state);
}

function pushLegacyConversationPrompt(): void {
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

function conversationMacroSymbolToIndex(sym: unknown): number {
  return conversationMacroSymbolToIndexImported(sym);
}

function conversationVmContextForSession(overrides: LegacyConversationVmOverrides | null = null): ConversationVmContextRuntime {
  const convState = state as LegacyConversationStateView;
  const ov = (overrides && typeof overrides === "object") ? overrides : {};
  return buildConversationVmContextImported({
    hour: Number(state.sim.world?.time_h) | 0,
    player: String(state.net?.characterName || "Avatar").trim() || "Avatar",
    target: String(ov.targetName || convState.legacyConversationTargetName || "").trim(),
    greeting: String(ov.greeting || "milady").trim() || "milady",
    partySize: Number(state.sim?.partySize) | 0,
    objNum: Number(ov.objNum) | 0
  });
}

function loadLegacyConversationScript(objNum: number, objType: number): Uint8Array | null {
  const convState = state as LegacyConversationStateView;
  return loadLegacyConversationScriptForNpcRuntime(
    { a: convState.converseArchiveA, b: convState.converseArchiveB },
    objNum,
    objType
  );
}

function parseConversationHeaderAndDesc(scriptBytes: Uint8Array | null | undefined): LegacyConversationHeader {
  return parseConversationHeaderAndDescRuntime(scriptBytes);
}

function isLikelyValidConversationScript(
  scriptBytes: Uint8Array | null | undefined,
  header: LegacyConversationHeader | null | undefined
): boolean {
  return isLikelyValidConversationScriptRuntime(scriptBytes, header);
}

function canonicalConversationHintIdFromSpeaker(speaker: unknown): number {
  return canonicalConversationHintIdFromSpeakerRuntime(speaker);
}

function headerMatchesExpectedCanonicalName(header: LegacyConversationHeader | null | undefined, objNum: number): boolean {
  return conversationHeaderMatchesExpectedCanonicalNameRuntime(header, objNum);
}

function headerMatchesExpectedCanonicalDesc(header: LegacyConversationHeader | null | undefined, objNum: number): boolean {
  return conversationHeaderMatchesExpectedCanonicalDescRuntime(header, objNum);
}

function headerIsPlausibleCanonicalFallback(
  script: Uint8Array | null | undefined,
  header: LegacyConversationHeader | null | undefined,
  objNum: number
): boolean {
  return conversationHeaderIsPlausibleCanonicalFallbackRuntime(script, header, objNum);
}

function resolveConversationScriptForActor(actor: LegacyConversationActor | null | undefined, tileId: number): LegacyConversationResolution {
  const actorId = Number(actor?.id) | 0;
  const actorType = Number(actor?.type) & 0x03ff;
  const actorQual = Number(actor?.qual) & 0xff;
  const speakerHint = canonicalTalkSpeakerForTile(tileId);
  const hintId = canonicalConversationHintIdFromSpeaker(speakerHint);
  const candidates: number[] = [];
  const pushCandidate = (n: unknown): void => {
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

function debugConversationResolutionSummary(actor: LegacyConversationActor | null | undefined, tileId: number): string {
  const convState = state as LegacyConversationStateView;
  const actorId = Number(actor?.id) | 0;
  const actorType = Number(actor?.type) & 0x03ff;
  const actorQual = Number(actor?.qual) & 0xff;
  const speakerHint = canonicalTalkSpeakerForTile(tileId);
  const hintId = canonicalConversationHintIdFromSpeaker(speakerHint);
  const candidates: number[] = [];
  const pushCandidate = (n: unknown): void => {
    const v = Number(n) | 0;
    if (v < 0) return;
    if (!candidates.includes(v)) candidates.push(v);
  };
  if (hintId >= 0) pushCandidate(hintId);
  if (actorType === 0x189 || actorType === 0x18d || actorType === 0x18e || actorType === 0x18f) {
    pushCandidate(actorQual);
  }
  pushCandidate(actorId);
  const parts: string[] = [];
  const convA = (convState.converseArchiveA instanceof Uint8Array) ? 1 : 0;
  const convB = (convState.converseArchiveB instanceof Uint8Array) ? 1 : 0;
  parts.push(`convA=${convA} convB=${convB} hint=${hintId} actor=${actorId} type=0x${actorType.toString(16)}`);
  for (const objNum of candidates) {
    const script = loadLegacyConversationScript(objNum, actorType);
    const header = parseConversationHeaderAndDesc(script);
    const validScript = isLikelyValidConversationScript(script, header) ? 1 : 0;
    const nameOk = headerMatchesExpectedCanonicalName(header, objNum) ? 1 : 0;
    const descOk = headerMatchesExpectedCanonicalDesc(header, objNum) ? 1 : 0;
    const fallbackOk = headerIsPlausibleCanonicalFallback(script, header, objNum) ? 1 : 0;
    const rules = script ? parseConversationRules(script, Number(header?.mainPc) | 0).length : 0;
    const headerName = sanitizeLegacyHudLabelText(String(header?.name || "").slice(0, 24));
    parts.push(`c${objNum}[v=${validScript} n=${nameOk} d=${descOk} f=${fallbackOk} r=${rules} h=${headerName || "-"}]`);
  }
  const loadDiag = String(convState.converseArchiveDiag || "").trim();
  if (loadDiag) {
    parts.push(`load{${loadDiag}}`);
  }
  return parts.join(" | ");
}

function splitConversationInputWords(input: unknown): string[] {
  return splitConversationInputWordsImported(input);
}

function conversationWordMatchesPattern(pattern: unknown, word: unknown): boolean {
  return conversationWordMatchesPatternImported(pattern, word);
}

function conversationKeyMatchesInput(pattern: unknown, input: unknown): boolean {
  return conversationKeyMatchesInputImported(pattern, input);
}

function parseConversationRules(scriptBytes: Uint8Array, mainPc: number): ConversationRule[] {
  return parseConversationRulesImported(scriptBytes, mainPc, {
    KEY: CONV_OP_KEY,
    RES: CONV_OP_RES,
    ENDRES: CONV_OP_ENDRES
  });
}

function findConversationFirstKeyPc(scriptBytes: Uint8Array, mainPc: number): number {
  return findConversationFirstKeyPcImported(scriptBytes, mainPc, {
    KEY: CONV_OP_KEY,
    RES: CONV_OP_RES,
    ENDRES: CONV_OP_ENDRES
  });
}

function decodeConversationResponseOpcodeAware(
  scriptBytes: Uint8Array,
  startPc: number,
  endPc: number,
  opts: ConversationDecodeOptionsRuntime | null = null
): ConversationDecodeResultRuntime {
  return decodeConversationResponseOpcodeAwareImported(scriptBytes, startPc, endPc, opts);
}

function decodeConversationResponseBytes(
  responseBytes: Uint8Array,
  scriptBytes: Uint8Array | null = null,
  startPc = -1,
  endPc = -1,
  vmContext: ConversationVmContextRuntime | null = null
): ConversationDecodeResultRuntime {
  return decodeConversationResponseBytesImported(responseBytes, scriptBytes, startPc, endPc, vmContext);
}

function decodeConversationOpeningLines(
  scriptBytes: Uint8Array,
  mainPc: number,
  vmContext: ConversationVmContextRuntime | null = null
): string[] {
  return decodeConversationOpeningLinesImported(scriptBytes, mainPc, vmContext);
}

function decodeConversationOpeningResult(
  scriptBytes: Uint8Array,
  mainPc: number,
  vmContext: ConversationVmContextRuntime | null = null
): ConversationDecodeResultRuntime {
  return decodeConversationOpeningResultImported(scriptBytes, mainPc, vmContext);
}

function renderConversationMacros(text: unknown, vmContext: ConversationVmContextRuntime | null = null): string {
  const convState = state as LegacyConversationStateView;
  const ctx = (vmContext && typeof vmContext === "object")
    ? vmContext
    : (convState.legacyConversationVmContext || conversationVmContextForSession());
  return renderConversationMacrosWithContextImported(text, ctx);
}

function canonicalTalkFallbackGreeting(
  objNum: number,
  speaker: unknown,
  vmContext: ConversationVmContextRuntime | null = null
): string {
  const convState = state as LegacyConversationStateView;
  const ctx = (vmContext && typeof vmContext === "object")
    ? vmContext
    : (convState.legacyConversationVmContext || conversationVmContextForSession());
  return canonicalTalkFallbackGreetingImported(
    objNum,
    ctx,
    conversationMacroSymbolToIndex
  );
}

function canonicalizeOpeningLines(objNum: number, lines: unknown): string[] {
  return canonicalizeOpeningLinesImported(
    objNum,
    lines,
    canonicalTalkFallbackGreeting(objNum, "Lord British")
  );
}

function formatYouSeeLine(subject: unknown): string {
  return formatYouSeeLineImported(subject);
}

function legacyConversationReply(
  targetName: unknown,
  typed: unknown
): ReturnType<typeof legacyConversationReplyImported> {
  const convState = state as LegacyConversationStateView;
  if (convState.legacyConversationScript instanceof Uint8Array) {
    const startPc = Number(convState.legacyConversationPc) | 0;
    if (startPc >= 0) {
      const cursorReply = conversationRunFromKeyCursor(
        convState.legacyConversationScript,
        startPc,
        typed,
        convState.legacyConversationVmContext
      );
      if (cursorReply && cursorReply.kind === "ok") {
        convState.legacyConversationPc = Number(cursorReply.nextPc) | 0;
        convState.legacyConversationInputOpcode = Number(cursorReply.stopOpcode) | 0;
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
    rules: convState.legacyConversationRules,
    script: convState.legacyConversationScript,
    vmContext: convState.legacyConversationVmContext,
    descText: convState.legacyConversationDescText,
    keyMatchesInput: conversationKeyMatchesInput,
    decodeResponseBytes: decodeConversationResponseBytes,
    renderMacros: renderConversationMacros,
    formatYouSeeLine
  });
}

function conversationRunFromKeyCursor(
  scriptBytes: Uint8Array,
  startPc: number,
  typed: unknown,
  vmContext: ConversationVmContextRuntime | null
): ReturnType<typeof conversationRunFromKeyCursorImported> {
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

function submitLegacyConversationInput(): void {
  const out = submitLegacyConversationInputImported(state, {
    pushLedgerMessage,
    pushPrompt: pushLegacyConversationPrompt,
    showPrompt: showLegacyLedgerPrompt,
    endConversation: endLegacyConversation,
    formatYouSeeLine,
    reply: (typed) => legacyConversationReply(state.legacyConversationTargetName, typed),
    startPagination: startLegacyConversationPagination
  });
  const diag = legacyConversationOkDiagRuntime(out?.diagText);
  if (diag) {
    applyDiag(diag);
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
    const diag = legacyConversationEndedDiagRuntime();
    applyDiag(diag);
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

function handleLegacyConversationKeydown(ev: KeyboardEvent): boolean {
  if (state.legacyConversationAuthoritative && !state.legacyConversationPaging && String(ev?.key || "") === "Enter") {
    submitAuthoritativeConversationInput().catch((err) => {
      const diag = legacyConversationReplyFailedDiagRuntime(errorMessageRuntime(err));
      applyDiag(diag);
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
  const diag = legacyConversationOkDiagRuntime(out?.diagText);
  if (diag) {
    applyDiag(diag);
  }
  return !!out?.handled;
}

function decodeU6ShapeFromBuffer(buf: Uint8Array | null | undefined): U6ShapeRuntime | null {
  return decodeU6ShapeFromBufferRuntime(buf);
}

function decodeU6ShpArchive(bytes: Uint8Array | null | undefined): Array<U6ShapeRuntime | null> {
  return decodeU6ShpArchiveRuntime(bytes, decompressU6Lzw);
}

function decodeU6CursorPtr(bytes: Uint8Array | null | undefined): U6ShapeRuntime[] {
  return decodeU6CursorPtrRuntime(bytes, decompressU6Lzw);
}

function decodePortraitFromArchive(bytes: Uint8Array | null | undefined, index = 0): IndexedPixmapRuntime | null {
  return decodePortraitFromArchiveRuntime(bytes, decompressU6Lzw, index);
}

function resolveLegacyPortraitEntry(objNum: unknown, objType: unknown): LegacyPortraitEntry | null {
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

function conversationPortraitCanvas(
  probeConversationPanel: LegacyConversationPanelPortraitProbe | null = null
): HTMLCanvasElement | null {
  const portraitState = state as LegacyPortraitStateView;
  if (!portraitState.basePalette) {
    return null;
  }
  const panel = probeConversationPanel && typeof probeConversationPanel === "object"
    ? probeConversationPanel
    : {};
  const objNum = panel.target_obj_num != null
    ? (Number(panel.target_obj_num) | 0)
    : (Number(portraitState.legacyConversationTargetObjNum) | 0);
  const objType = panel.target_obj_type != null
    ? (Number(panel.target_obj_type) | 0)
    : (Number(portraitState.legacyConversationTargetObjType) | 0);
  const resolved = resolveLegacyPortraitEntry(objNum, objType);
  if (!resolved) {
    return portraitState.avatarPortraitCanvas;
  }
  const archive = resolved.archive === "b" ? portraitState.portraitArchiveB : portraitState.portraitArchiveA;
  if (!archive) {
    return null;
  }
  const paletteKey = getRenderPaletteKey();
  const cacheKey = `${resolved.archive}:${resolved.index}:${paletteKey}`;
  if (portraitState.portraitCanvasCache.has(cacheKey)) {
    return portraitState.portraitCanvasCache.get(cacheKey) || null;
  }
  const pix = decodePortraitFromArchive(archive, resolved.index);
  if (!pix) {
    return null;
  }
  const canvas = canvasFromIndexedPixels(pix, getRenderPalette() || portraitState.basePalette);
  if (!canvas) {
    return null;
  }
  portraitState.portraitCanvasCache.set(cacheKey, canvas);
  return canvas;
}

function canvasFromIndexedPixels(
  pixmap: IndexedPixmapRuntime | null | undefined,
  palette: RgbPaletteRuntime | null | undefined,
  transparentIndex: number | null = null
): HTMLCanvasElement | null {
  return canvasFromIndexedPixelsRuntime(pixmap, palette, document, transparentIndex);
}

function drawU6MainText(
  g: LegacyTextCanvasRuntime,
  text: unknown,
  sx: number,
  sy: number,
  scale = 1,
  color = "#e7dcc0"
): void {
  drawU6MainTextRuntime(g, state.u6MainFont, text, sx, sy, scale, color);
}

function u6GlyphSpan(code: number): LegacyGlyphSpanRuntime {
  return u6GlyphSpanRuntime(state.u6MainFont, code);
}

function measureU6TextWidth(text: unknown, compact = false): number {
  return measureU6TextWidthRuntime(state.u6MainFont, text, compact);
}

function drawU6CompactText(
  g: U6TextCanvasApp,
  text: unknown,
  sx: number,
  sy: number,
  scale = 1,
  color = "#e7dcc0"
): void {
  drawU6CompactTextRuntime(g as LegacyTextCanvasRuntime, state.u6MainFont, text, sx, sy, scale, color);
}

function drawLegacyContinueArrow(
  g: LegacyTextCanvasRuntime,
  sx: number,
  sy: number,
  scale = 1,
  color = "#e7dcc0"
): void {
  drawLegacyContinueArrowRuntime(g, state.u6MainFont, sx, sy, scale, color);
}

function applyLegacyFrameLayout(): void {
  const renderState = state as LegacyBackdropRenderStateView;
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

  const pixmap = renderState.legacyPaperPixmap;
  const pal = renderState.basePalette;
  if (!pixmap || !pal || pal.length < 256) {
    return;
  }

  const srcW = pixmap.width | 0;
  const srcH = pixmap.height | 0;
  const host = legacyWorldSurface.parentElement || legacyWorldSurface;
  const hostRect = host.getBoundingClientRect();
  const layout = legacyFrameLayoutModelRuntime({
    hostH: hostRect.height,
    hostW: hostRect.width,
    legacyScaleMode: renderState.legacyScaleMode,
    mapRect: LEGACY_UI_MAP_RECT,
    srcH,
    srcW
  });

  const src = document.createElement("canvas");
  src.width = srcW;
  src.height = srcH;
  const sg = src.getContext("2d");
  if (!sg) {
    return;
  }
  const id = sg.createImageData(srcW, srcH);
  for (let i = 0, p = 0; i < pixmap.pixels.length; i += 1, p += 4) {
    const c = pal[pixmap.pixels[i] & 0xff] ?? [0, 0, 0];
    id.data[p + 0] = c[0] | 0;
    id.data[p + 1] = c[1] | 0;
    id.data[p + 2] = c[2] | 0;
    id.data[p + 3] = 255;
  }
  sg.putImageData(id, 0, 0);

  legacyBackdropCanvas.width = layout.outW;
  legacyBackdropCanvas.height = layout.outH;
  const bg = legacyBackdropCanvas.getContext("2d");
  if (!bg) {
    return;
  }
  bg.imageSmoothingEnabled = false;
  bg.clearRect(0, 0, layout.outW, layout.outH);
  bg.drawImage(src, 0, 0, srcW, srcH, 0, 0, layout.outW, layout.outH);
  if (!renderState.legacyBackdropBaseCanvas) {
    renderState.legacyBackdropBaseCanvas = document.createElement("canvas");
  }
  const baseCanvas = renderState.legacyBackdropBaseCanvas;
  baseCanvas.width = layout.outW;
  baseCanvas.height = layout.outH;
  const bb = baseCanvas.getContext("2d");
  if (!bb) {
    return;
  }
  bb.imageSmoothingEnabled = false;
  bb.clearRect(0, 0, layout.outW, layout.outH);
  bb.drawImage(legacyBackdropCanvas, 0, 0);

  legacyWorldSurface.style.width = `${layout.outW}px`;
  legacyWorldSurface.style.height = `${layout.outH}px`;
  legacyViewportCanvas.style.left = `${layout.mapRect.x}px`;
  legacyViewportCanvas.style.top = `${layout.mapRect.y}px`;
  legacyViewportCanvas.style.width = `${layout.mapRect.w}px`;
  legacyViewportCanvas.style.height = `${layout.mapRect.h}px`;
}

function renderLegacyHudStubOnBackdrop(): void {
  const renderState = state as LegacyBackdropRenderStateView;
  if (!legacyBackdropCanvas) {
    return;
  }
  const g = legacyBackdropCanvas.getContext("2d");
  if (!g) {
    return;
  }
  const plan = legacyHudBackdropRenderPlanRuntime({
    backdropH: legacyBackdropCanvas.height,
    backdropW: legacyBackdropCanvas.width,
    baseH: renderState.legacyBackdropBaseCanvas?.height,
    baseW: renderState.legacyBackdropBaseCanvas?.width,
    legacyFramePreviewEnabled: document.documentElement.getAttribute("data-legacy-frame-preview") === "on"
  });
  if (plan.kind === "skip") {
    return;
  }
  g.imageSmoothingEnabled = false;
  if (plan.restoreBase && renderState.legacyBackdropBaseCanvas) {
    g.clearRect(0, 0, plan.backdropW, plan.backdropH);
    g.drawImage(renderState.legacyBackdropBaseCanvas, 0, 0);
  }
  if (renderState.legacyHudLayerHidden) {
    return;
  }

  const scale = plan.scale;
  const x = (v: number): number => v * scale;
  const y = (v: number): number => v * scale;
  const drawTile = (tileId: number, sx: number, sy: number): void => {
    if (!renderState.tileSet) {
      return;
    }
    const pal = paletteForTile(tileId);
    if (!pal) {
      return;
    }
    const key = paletteKeyForTile(tileId);
    const tc = renderState.tileSet.tileCanvas(tileId, pal, key);
    if (!tc) {
      return;
    }
    g.drawImage(tc, x(sx), y(sy), x(16), y(16));
  };
  const drawTilePx = (tileId: number, px: number, py: number): void => {
    if (!renderState.tileSet) {
      return;
    }
    const pal = paletteForTile(tileId);
    if (!pal) {
      return;
    }
    const key = paletteKeyForTile(tileId);
    const tc = renderState.tileSet.tileCanvas(tileId, pal, key);
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
      if (!isEclipse && renderState.objectLayer?.baseTiles) {
        const moonBase = Number(renderState.objectLayer.baseTiles[0x49]) | 0;
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

  const invFromKey = (key: unknown): number | null => {
    const src = String(key || "").trim();
    let m = /^0x([0-9a-f]+):0x?([0-9a-f]+)$/i.exec(src);
    if (!m) {
      /* Back-compat for pre-fix local runtime keys. */
      m = /^obj_([0-9a-f]+)_([0-9a-f]+)$/i.exec(src);
    }
    if (!m || !renderState.objectLayer?.baseTiles) {
      return null;
    }
    const type = parseInt(m[1], 16) & 0x03ff;
    const frame = parseInt(m[2], 16) & 0x00ff;
    const base = renderState.objectLayer.baseTiles[type] ?? 0;
    if (!base) {
      return null;
    }
    return (base + frame) & 0xffff;
  };
  const invTileFromEntry = (entry: LegacyInventoryDisplayEntry | null | undefined): number | null => {
    const direct = parseProbeTileHex(entry?.tile_hex);
    if (direct != null) {
      return direct;
    }
    return invFromKey(entry?.key);
  };
  const buildDisplayInventoryEntries = (): LegacyInventoryDisplayEntry[] => {
    const out: LegacyInventoryDisplayEntry[] = [];
    const seen = new Set<string>();
    const inventoryObjects = state.sim && Array.isArray(state.sim.inventoryObjects)
      ? state.sim.inventoryObjects
      : [];
    if (inventoryObjects.length > 0) {
      return inventoryDisplayEntriesFromObjectsRuntime(inventoryObjects, 12);
    }
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
    const baseEntries = (probe.canonical_ui?.inventory_panel?.entries || []) as LegacyInventoryDisplayEntry[];
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
  const statusDisplay = Number(renderState.legacyStatusDisplay) | 0;
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
    talkShowInventory: renderState.legacyConversationShowInventory !== false
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
    const talkLabel = sanitizeLegacyHudLabelText(String(conversationPanel.target_name || renderState.legacyConversationTargetName || "Converse")) || "Converse";
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
  const slotByKey = new Map<string, LegacyPanelSlotEntry>();
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
    ? (Array.isArray(renderState.legacyConversationEquipmentSlots) ? renderState.legacyConversationEquipmentSlots : [])
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

  if (renderState.legacyHudSelection) {
    g.strokeStyle = "#f59e0b";
    g.lineWidth = Math.max(1, scale);
    const sel = renderState.legacyHudSelection;
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
    const partyCount = partyCountRaw;
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

function currentInGameServerStatusOverlay(nowMs: number): { color: string; text: string } | null {
  return currentInGameServerStatusOverlayRuntime({
    isServerConnectionBroken: isServerConnectionBroken(),
    nowMs,
    reconnectedMessageUntilMs: state.reconnectedMessageUntilMs
  });
}

function drawInGameServerStatusOverlay(): void {
  const overlay = currentInGameServerStatusOverlay(performance.now());
  if (!overlay) {
    return;
  }
  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  const plans = serverStatusOverlaySurfacePlansRuntime({
    canvasW: canvas?.width,
    hasLegacyBackdropCanvas: !!legacyBackdropCanvas,
    hasLegacyViewportCanvas: !!legacyViewportCanvas,
    hasMainCanvas: !!canvas,
    hasMainContext: !!ctx,
    legacyBackdropW: legacyBackdropCanvas?.width,
    legacyFramePreviewEnabled: enabled,
    viewportOffsetX: LEGACY_UI_MAP_RECT.x,
    viewportOffsetY: LEGACY_UI_MAP_RECT.y
  });
  for (const plan of plans) {
    const g = plan.kind === "legacy_backdrop"
      ? legacyBackdropCanvas?.getContext("2d")
      : plan.kind === "legacy_viewport"
        ? legacyViewportCanvas?.getContext("2d")
        : ctx;
    if (!g) {
      continue;
    }
    g.imageSmoothingEnabled = false;
    drawServerStatusOverlayRuntime({
      canvas: g,
      color: overlay.color,
      drawText: drawU6MainText,
      offsetX: plan.offsetX,
      offsetY: plan.offsetY,
      scale: plan.scale,
      text: overlay.text
    });
  }
}

function drawLegacyTileScaled(
  g: CanvasRenderingContext2D,
  tileId: number,
  sx: number,
  sy: number,
  scale: number
): void {
  const renderState = state as StartupMenuRenderStateView;
  if (!renderState.tileSet) {
    return;
  }
  const pal = paletteForTile(tileId);
  if (!pal) {
    return;
  }
  const key = paletteKeyForTile(tileId);
  const tc = renderState.tileSet.tileCanvas(tileId, pal, key);
  if (!tc) {
    return;
  }
  g.drawImage(tc, sx, sy, 16 * scale, 16 * scale);
}

function renderStartupMenuLayer(g: CanvasRenderingContext2D, scale: number): void {
  const startupState = state as StartupMenuRenderStateView;
  const startupPal = buildStartupPaletteForMenu();
  const titlePixmaps = startupState.startupTitlePixmaps;
  const hasStartupArt = !!(startupPal
    && titlePixmaps
    && titlePixmaps[0]
    && titlePixmaps[1]
    && startupState.startupMenuPixmap);
  const plan = buildStartupMenuRenderPlanRuntime({
    hasStartupArt,
    hudTextColor: LEGACY_HUD_TEXT_COLOR,
    isAuthenticated: isNetAuthenticated(),
    menu: STARTUP_MENU,
    scale,
    selectedIndex: startupState.startupMenuIndex,
    slotTileId: LEGACY_UI_TILE.SLOT_EMPTY
  });
  g.fillStyle = plan.clear.fillStyle;
  g.fillRect(plan.clear.x, plan.clear.y, plan.clear.w, plan.clear.h);
  if (plan.useStartupArt && startupPal) {
    const drawSprite = (
      key: string,
      pixmap: IndexedPixmapRuntime | null | undefined,
      sx: number,
      sy: number
    ): void => {
      if (!pixmap) {
        return;
      }
      const cacheKey = `${key}:${startupState.startupMenuIndex}`;
      const sprite = startupCachedCanvasRuntime({
        cache: startupState.startupCanvasCache,
        cacheKey,
        createCanvas: () => canvasFromIndexedPixels(pixmap, startupPal, 0xff)
      });
      if (!sprite) {
        return;
      }
      g.drawImage(sprite, sx, sy, sprite.width * scale, sprite.height * scale);
    };
    for (const sprite of plan.artSprites) {
      drawSprite(
        sprite.key,
        sprite.key === "title"
          ? titlePixmaps?.[0]
          : (sprite.key === "subtitle" ? titlePixmaps?.[1] : startupState.startupMenuPixmap),
        sprite.x,
        sprite.y
      );
    }
    return;
  }

  for (const tile of plan.tiles) {
    drawLegacyTileScaled(g, tile.tileId, tile.x, tile.y, tile.scale);
  }
  for (const rect of plan.rects) {
    g.fillStyle = rect.fillStyle;
    g.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  for (const stroke of plan.strokes) {
    g.strokeStyle = stroke.strokeStyle;
    g.strokeRect(stroke.x, stroke.y, stroke.w, stroke.h);
  }
  for (const text of plan.texts) {
    drawU6MainText(g, text.text, text.x, text.y, text.scale, text.color);
  }
}

function buildStartupPaletteForMenu(): RgbPaletteRuntime | null {
  const startupState = state as StartupMenuRenderStateView;
  return buildStartupPaletteForMenuRuntime(startupState.basePalette, startupState.startupMenuIndex);
}

function activeTitleIntroPalette(scene: BootIntroSceneSpec | { kind: "lounge" } | null = null): RgbPaletteRuntime | null {
  const introState = state as BootIntroRenderStateView;
  return activeBootIntroPaletteRuntime({
    basePalette: introState.basePalette,
    fallbackPalette: buildStartupPaletteForMenu(),
    introPalettes: introState.bootIntroPalettes,
    scene,
    sceneElapsedMs: Number(introState.bootIntro?.sceneElapsedMs) | 0
  });
}

function bootIntroPaletteCacheKey(scene: BootIntroSceneSpec | { kind: "lounge" } | null = null): string {
  const introState = state as BootIntroRenderStateView;
  return bootIntroPaletteCacheKeyRuntime(scene, Number(introState.bootIntro?.sceneElapsedMs) | 0);
}

function bootIntroSceneSpriteCanvas(
  bankName: BootIntroBankName,
  frameIdx: number,
  scene: BootIntroSceneSpec | null = null
): HTMLCanvasElement | null {
  const introState = state as BootIntroRenderStateView;
  const banks = introState.bootIntroBanks;
  const bank = banks && typeof banks === "object" ? banks[bankName] : null;
  const pixmap = Array.isArray(bank) ? bank[frameIdx] : null;
  const pal = activeTitleIntroPalette(scene);
  if (!pixmap || !pal) {
    return null;
  }
  const cacheKey = `${bankName}:${frameIdx}:${bootIntroPaletteCacheKey(scene)}`;
  return bootIntroCachedCanvasRuntime({
    cache: introState.bootIntroCanvasCache,
    cacheKey,
    createCanvas: () => canvasFromIndexedPixels(pixmap, pal, 0xff)
  });
}

function bootIntroBlockSpriteCanvas(frameIdx: number, scene: BootIntroSceneSpec | null = null): HTMLCanvasElement | null {
  const introState = state as BootIntroRenderStateView;
  const bank = introState.bootIntroBlocks;
  const pixmap = Array.isArray(bank) ? bank[frameIdx] : null;
  const pal = activeTitleIntroPalette(scene);
  if (!pixmap || !pal) {
    return null;
  }
  const cacheKey = `blocks:${frameIdx}:${bootIntroPaletteCacheKey(scene)}`;
  return bootIntroCachedCanvasRuntime({
    cache: introState.bootIntroCanvasCache,
    cacheKey,
    createCanvas: () => canvasFromIndexedPixels(pixmap, pal, 0xff)
  });
}

function drawBootIntroSprite(
  g: CanvasRenderingContext2D,
  bankName: BootIntroBankName,
  frameIdx: number,
  lx: number,
  ly: number,
  scale: number,
  scene: BootIntroSceneSpec | null = null,
  sw: number | null = null,
  sh: number | null = null,
  alpha = 1
): void {
  const sprite = bootIntroSceneSpriteCanvas(bankName, frameIdx, scene);
  if (!sprite) {
    return;
  }
  const prevAlpha = g.globalAlpha;
  const rect = bootIntroSpriteDrawRectRuntime({
    alpha,
    h: sh,
    scale,
    spriteHeight: sprite.height,
    spriteWidth: sprite.width,
    w: sw,
    x: lx,
    y: ly
  });
  g.globalAlpha = rect.alpha;
  g.drawImage(
    sprite,
    rect.x,
    rect.y,
    rect.w,
    rect.h
  );
  g.globalAlpha = prevAlpha;
}

function drawBootIntroClippedSprite(
  g: CanvasRenderingContext2D,
  bankName: BootIntroBankName,
  frameIdx: number,
  lx: number,
  ly: number,
  scale: number,
  scene: BootIntroSceneSpec,
  clipX: number,
  clipY: number,
  clipW: number,
  clipH: number
): void {
  const clip = bootIntroClipRectRuntime({ clipH, clipW, clipX, clipY, scale });
  g.save();
  g.beginPath();
  g.rect(clip.x, clip.y, clip.w, clip.h);
  g.clip();
  drawBootIntroSprite(g, bankName, frameIdx, lx, ly, scale, scene);
  g.restore();
}

function drawBootIntroTvStatic(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  seed: number,
  width = 57,
  height = 37
): void {
  const pal = activeTitleIntroPalette({ kind: "lounge" }) || [];
  for (const cell of bootIntroTvStaticDrawCellsRuntime({ height, palette: pal, scale, seed, width, x, y })) {
    g.fillStyle = cell.color;
    g.fillRect(cell.x, cell.y, cell.w, cell.h);
  }
}

function bootIntroDecompress(bytes: Uint8Array | null | undefined): Uint8Array | null {
  return bytes ? decompressU6Lzw(bytes) : null;
}

function decodeBootIntroWouFont(bytes: Uint8Array | null | undefined): BootIntroWouFontRuntime | null {
  return decodeBootIntroWouFontRuntime(bytes, bootIntroDecompress);
}

function bootIntroWouCharWidth(font: BootIntroWouFontRuntime | null | undefined, code: number): number {
  return bootIntroWouCharWidthRuntime(font, code);
}

function measureBootIntroTextWidth(text: unknown): number {
  const introState = state as BootIntroRenderStateView;
  return measureBootIntroTextWidthRuntime(introState.bootIntroFont, text, (fallbackText) => measureU6TextWidth(fallbackText, true));
}

function drawBootIntroWouText(
  g: BootIntroTextCanvasRuntime,
  text: unknown,
  sx: number,
  sy: number,
  scale = 1,
  color = "#e7dcc0"
): number {
  const introState = state as BootIntroRenderStateView;
  return drawBootIntroWouTextRuntime(g, {
    color,
    drawFallbackText: (ctx, fallbackText, x, y, s, c) => drawU6CompactText(ctx, fallbackText, x, y, s, c),
    fallbackMeasure: (fallbackText) => measureU6TextWidth(fallbackText, true),
    font: introState.bootIntroFont,
    scale,
    sx,
    sy,
    text
  });
}

function drawBootIntroTextRun(
  g: BootIntroTextCanvasRuntime,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string
): number {
  const endX = drawBootIntroWouText(g, text, Math.round(x * scale), Math.round(y * scale), Math.max(1, scale), color);
  return Math.round(endX / Math.max(1, scale));
}

function bootIntroPrintText(
  g: BootIntroTextCanvasRuntime,
  text: unknown,
  startX: number,
  width: number,
  x: number,
  y: number,
  scale: number,
  color: string
): { x: number; y: number } {
  const font = (state as BootIntroRenderStateView).bootIntroFont;
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

function bootIntroPrintTextOnCard(
  g: BootIntroTextCanvasRuntime,
  cardX: number,
  cardY: number,
  text: unknown,
  startX: number,
  width: number,
  x: number,
  y: number,
  scale: number,
  color: string
): { x: number; y: number } {
  const font = (state as BootIntroRenderStateView).bootIntroFont;
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

function wrapBootIntroTextPixels(text: unknown, maxWidthPx: number): string[] {
  return wrapBootIntroTextPixelsRuntime(text, maxWidthPx, measureBootIntroTextWidth);
}

function renderBootIntroTextCard(
  g: CanvasRenderingContext2D,
  scale: number,
  scene: BootIntroSceneSpec,
  card: BootIntroTextCard | null | undefined
): void {
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
    if (!card) {
      return;
    }
    let last = { x: 0, y: 0 };
    for (const plannedOp of plan.printOps) {
      const op = resolveBootIntroTextCardPrintOpRuntime(plannedOp, last);
      last = bootIntroPrintTextOnCard(
        g,
        Number(card.x) || 0,
        Number(card.y) || 0,
        op.text,
        op.startX,
        op.width,
        op.resolvedX,
        op.resolvedY,
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

function renderBootIntroSplash(g: CanvasRenderingContext2D, scene: BootIntroSceneSpec, scale: number): void {
  const frame = Number(scene?.splashFrame) | 0;
  const sprite = bootIntroSceneSpriteCanvas("intro1", frame, scene);
  const plan = buildBootIntroSplashRenderPlanRuntime({
    scale,
    scene,
    spriteHeight: sprite?.height,
    spriteWidth: sprite?.width
  });
  g.fillStyle = "#000000";
  g.fillRect(0, 0, 320 * scale, 200 * scale);
  if (!sprite || !plan.sprite) {
    return;
  }
  g.drawImage(sprite, plan.sprite.x, plan.sprite.y, plan.sprite.w, plan.sprite.h);
}

function renderBootIntroLounge(g: CanvasRenderingContext2D, scene: BootIntroSceneSpec, scale: number): void {
  const introState = state as BootIntroRenderStateView;
  const plan = buildBootIntroLoungeRenderPlanRuntime({
    elapsedMs: introState.bootIntro?.sceneElapsedMs,
    scene
  });
  if (plan.clear) {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, 320 * scale, 200 * scale);
  }
  for (const sprite of plan.sprites) {
    drawBootIntroSprite(g, sprite.bank, sprite.frame, sprite.x, sprite.y, scale, scene, sprite.w, sprite.h, sprite.alpha);
  }
  for (const staticOp of plan.staticOps) {
    g.save();
    g.beginPath();
    g.rect(
      Math.round(Math.max(0, staticOp.x) * scale),
      Math.round(staticOp.y * scale),
      Math.round(staticOp.w * scale),
      Math.round(staticOp.h * scale)
    );
    g.clip();
    drawBootIntroTvStatic(g, staticOp.x, staticOp.y, scale, staticOp.seed, staticOp.w, staticOp.h);
    g.restore();
  }
  for (const sprite of plan.clippedSprites) {
    drawBootIntroClippedSprite(
      g,
      sprite.bank,
      sprite.frame,
      sprite.x,
      sprite.y,
      scale,
      scene,
      sprite.clipX,
      sprite.clipY,
      sprite.clipW,
      sprite.clipH
    );
  }
}

function renderBootIntroWindow(g: CanvasRenderingContext2D, scene: BootIntroSceneSpec, scale: number): void {
  const introState = state as BootIntroRenderStateView;
  const plan = buildBootIntroWindowRenderPlanRuntime({
    elapsedMs: introState.bootIntro?.sceneElapsedMs,
    scene
  });
  if (plan.clear) {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, 320 * scale, 200 * scale);
  }
  for (const sprite of plan.sprites) {
    drawBootIntroSprite(g, sprite.bank, sprite.frame, sprite.x, sprite.y, scale, scene, sprite.w, sprite.h, sprite.alpha);
  }
}

function renderBootIntroStones(g: CanvasRenderingContext2D, scene: BootIntroSceneSpec, scale: number): void {
  const introState = state as BootIntroRenderStateView;
  const plan = buildBootIntroStonesRenderPlanRuntime({
    elapsedMs: introState.bootIntro?.sceneElapsedMs,
    scene
  });
  if (plan.clear) {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, 320 * scale, 200 * scale);
  }
  for (const sprite of plan.sprites) {
    drawBootIntroSprite(g, sprite.bank, sprite.frame, sprite.x, sprite.y, scale, scene, sprite.w, sprite.h, sprite.alpha);
  }
  for (const sprite of plan.clippedSprites) {
    drawBootIntroClippedSprite(
      g,
      sprite.bank,
      sprite.frame,
      sprite.x,
      sprite.y,
      scale,
      scene,
      sprite.clipX,
      sprite.clipY,
      sprite.clipW,
      sprite.clipH
    );
  }
}

function renderBootIntroLayer(g: CanvasRenderingContext2D, scale: number): void {
  const introState = state as BootIntroRenderStateView;
  const plan = buildBootIntroLayerRenderPlanRuntime(introState.bootIntro);
  if (plan.kind === "startup") {
    renderStartupMenuLayer(g, scale);
    return;
  }
  if (plan.sceneKind === "splash") {
    renderBootIntroSplash(g, plan.scene, scale);
  } else if (plan.sceneKind === "lounge") {
    renderBootIntroLounge(g, plan.scene, scale);
  } else if (plan.sceneKind === "window") {
    renderBootIntroWindow(g, plan.scene, scale);
  } else {
    renderBootIntroStones(g, plan.scene, scale);
  }
  renderBootIntroTextCard(g, scale, plan.scene, plan.scene.textCard || null);
  if (plan.overlayAlpha > 0) {
    g.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, plan.overlayAlpha / 255))})`;
    g.fillRect(0, 0, 320 * scale, 200 * scale);
  }
}

function renderStartupScreen(): void {
  const introState = state as BootIntroRenderStateView;
  const compositionState = state as LegacyCompositionStateView;
  if (!ctx) {
    return;
  }
  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  const plan = buildStartupScreenRenderPlanRuntime({
    bootIntroActive: !!(introState.bootIntro && introState.bootIntro.active),
    canvasW: canvas.width,
    legacyBackdropBaseH: compositionState.legacyBackdropBaseCanvas?.height,
    legacyBackdropBaseW: compositionState.legacyBackdropBaseCanvas?.width,
    legacyBackdropH: legacyBackdropCanvas?.height,
    legacyBackdropW: legacyBackdropCanvas?.width,
    legacyPreviewEnabled: enabled && !!legacyBackdropCanvas
  });
  if (plan.mainLayer === "boot_intro") {
    renderBootIntroLayer(ctx, plan.mainScale);
  } else {
    renderStartupMenuLayer(ctx, plan.mainScale);
  }

  if (!plan.legacyPreview || !legacyBackdropCanvas) {
    return;
  }
  const g = legacyBackdropCanvas.getContext("2d");
  if (!g) {
    return;
  }
  g.imageSmoothingEnabled = false;
  if (plan.legacyPreview.restoreBase && compositionState.legacyBackdropBaseCanvas) {
    g.clearRect(0, 0, plan.legacyPreview.backdropW, plan.legacyPreview.backdropH);
    g.drawImage(compositionState.legacyBackdropBaseCanvas, 0, 0);
  } else {
    g.fillStyle = "#000";
    g.fillRect(0, 0, plan.legacyPreview.backdropW, plan.legacyPreview.backdropH);
  }
  if (plan.legacyPreview.layer === "boot_intro") {
    renderBootIntroLayer(g, plan.legacyPreview.scale);
  } else {
    renderStartupMenuLayer(g, plan.legacyPreview.scale);
  }

  legacyViewportCanvas.width = 160;
  legacyViewportCanvas.height = 160;
  const lv = legacyViewportCanvas.getContext("2d");
  if (!lv) {
    return;
  }
  lv.imageSmoothingEnabled = false;
  lv.clearRect(0, 0, 160, 160);
  const viewport = plan.legacyPreview.viewport;
  lv.drawImage(
    legacyBackdropCanvas,
    viewport.sourceX,
    viewport.sourceY,
    viewport.sourceW,
    viewport.sourceH,
    viewport.destX,
    viewport.destY,
    viewport.destW,
    viewport.destH
  );
}

function drawCustomCursorOnContext(
  g: CanvasRenderingContext2D | null,
  targetW: number,
  targetH: number,
  opts: CursorDrawOptions | null = null
): void {
  const cursorState = state as LegacyCompositionStateView;
  const cursorPixmaps = cursorState.cursorPixmaps;
  const selection = cursorShapeSelectionRuntime({
    cursorIndex: cursorState.cursorIndex,
    cursorPixmaps,
    mouseInCanvas: cursorState.mouseInCanvas,
    targetCursorIndex: legacyVerbMouseCursorIndexRuntime(state.targetVerb),
    useCursorActive: state.useCursorActive
  });
  if (!selection) {
    return;
  }
  const cursorShape = selection.shape;
  if (!cursorShape || !cursorState.basePalette || !g || targetW <= 0 || targetH <= 0) {
    return;
  }
  const cursorCanvas = canvasFromIndexedPixels(cursorShape, getRenderPalette() || cursorState.basePalette, 0xff);
  if (!cursorCanvas) {
    return;
  }
  const logicalW = (opts && Number.isFinite(opts.logicalW) && Number(opts.logicalW) > 0)
    ? Number(opts.logicalW)
    : cursorLogicalWidthRuntime({
      isLegacyFramePreview: isLegacyFramePreviewOn(),
      sessionStarted: cursorState.sessionStarted,
      viewWidthTiles: VIEW_W
    });
  const drawRect = cursorDrawRectRuntime({
    aspectX: CURSOR_ASPECT_X,
    aspectY: CURSOR_ASPECT_Y,
    logicalW,
    mouseNormX: cursorState.mouseNormX,
    mouseNormY: cursorState.mouseNormY,
    mouseX: opts && Number.isFinite(opts.mouseX) ? Number(opts.mouseX) : undefined,
    mouseY: opts && Number.isFinite(opts.mouseY) ? Number(opts.mouseY) : undefined,
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

function drawCustomCursorLayer(): void {
  const cursorState = state as LegacyCompositionStateView;
  if (isLegacyFramePreviewOn()) {
    if (!legacyBackdropCanvas) {
      return;
    }
    const bw = legacyBackdropCanvas.width | 0;
    const bh = legacyBackdropCanvas.height | 0;
    if (bw <= 0 || bh <= 0) {
      return;
    }
    const target = legacyCursorLayerTargetRuntime({
      backdropH: bh,
      backdropW: bw,
      hasViewport: !!legacyViewportCanvas,
      mapRect: LEGACY_UI_MAP_RECT,
      mouseNormX: cursorState.mouseNormX,
      mouseNormY: cursorState.mouseNormY,
      sessionStarted: cursorState.sessionStarted
    });
    if (!target) {
      return;
    }

    if (target.kind === "viewport" && legacyViewportCanvas) {
      const vg = legacyViewportCanvas.getContext("2d");
      drawCustomCursorOnContext(
        vg,
        legacyViewportCanvas.width | 0,
        legacyViewportCanvas.height | 0,
        { mouseX: target.mouseX, mouseY: target.mouseY, logicalW: target.logicalW }
      );
      return;
    }
    const g = legacyBackdropCanvas.getContext("2d");
    drawCustomCursorOnContext(g, bw, bh, { mouseX: target.mouseX, mouseY: target.mouseY, logicalW: target.logicalW });
    return;
  }
  drawCustomCursorOnContext(ctx, canvas.width | 0, canvas.height | 0);
}

function composeLegacyViewportFromModernGrid(): void {
  const compositionState = state as LegacyCompositionStateView;
  const enabled = document.documentElement.getAttribute("data-legacy-frame-preview") === "on";
  const plan = legacyViewportCompositionPlanRuntime({
    canvasAvailable: !!canvas,
    frameTiles: LEGACY_FRAME_TILES,
    legacyFramePreviewEnabled: enabled,
    viewportCanvasAvailable: !!legacyViewportCanvas
  });
  if (plan.kind === "skip" || !legacyViewportCanvas || !canvas) {
    return;
  }

  if (!compositionState.legacyComposeCanvas) {
    compositionState.legacyComposeCanvas = document.createElement("canvas");
    compositionState.legacyComposeCanvas.width = plan.composeW;
    compositionState.legacyComposeCanvas.height = plan.composeH;
  }
  const compose = compositionState.legacyComposeCanvas;
  if (compose.width !== plan.composeW) {
    compose.width = plan.composeW;
  }
  if (compose.height !== plan.composeH) {
    compose.height = plan.composeH;
  }
  const cctx = compose.getContext("2d");
  if (!cctx) {
    return;
  }
  cctx.imageSmoothingEnabled = false;
  cctx.clearRect(0, 0, plan.composeW, plan.composeH);
  /* 704 -> 176 is exact /4, keeping tile edge parity intact before crop. */
  cctx.drawImage(
    canvas,
    plan.sourceToCompose.sourceX,
    plan.sourceToCompose.sourceY,
    plan.sourceToCompose.sourceW,
    plan.sourceToCompose.sourceH,
    plan.sourceToCompose.destX,
    plan.sourceToCompose.destY,
    plan.sourceToCompose.destW,
    plan.sourceToCompose.destH
  );

  if (compositionState.tileSet) {
    const drawFrameTile = (tileId: number, x: number, y: number): void => {
      const pal = paletteForTile(tileId);
      if (!pal) {
        return;
      }
      const key = paletteKeyForTile(tileId);
      const tc = compositionState.tileSet?.tileCanvas(tileId, pal, key);
      if (tc) {
        cctx.drawImage(tc, x, y);
      }
    };

    for (const placement of plan.framePlacements) {
      drawFrameTile(placement.tileId, placement.x, placement.y);
    }
  }

  legacyViewportCanvas.width = plan.viewportW;
  legacyViewportCanvas.height = plan.viewportH;
  const lv = legacyViewportCanvas.getContext("2d");
  if (!lv) {
    return;
  }
  lv.imageSmoothingEnabled = false;
  lv.clearRect(0, 0, plan.viewportW, plan.viewportH);
  /* Legacy map cutout sits at 8,8 with 160x160 size. */
  lv.drawImage(
    compose,
    plan.viewportCrop.sourceX,
    plan.viewportCrop.sourceY,
    plan.viewportCrop.sourceW,
    plan.viewportCrop.sourceH,
    plan.viewportCrop.destX,
    plan.viewportCrop.destY,
    plan.viewportCrop.destW,
    plan.viewportCrop.destH
  );
}

function initRuntimeProfileConfig(): void {
  initRuntimeProfileConfigRuntime({
    documentElement: document.documentElement,
    keys: {
      profileKey: RUNTIME_PROFILE_KEY,
      extensionsKey: RUNTIME_EXTENSIONS_KEY
    },
    locationSearch: window.location.search,
    state,
    storage: localStorage
  });
}

function setTheme(themeName: string): void {
  applyThemePreferenceRuntime({ theme: themeName, allowedThemes: THEMES, fallback: "obsidian", key: THEME_KEY, documentElement: document.documentElement, select: themeSelect, wikiLink, storage: localStorage });
}

function initTheme(): void {
  initChoicePreferenceRuntime({ storage: localStorage, key: THEME_KEY, fallback: "obsidian", allowed: THEMES, select: themeSelect, onApply: setTheme });
}

function setFont(fontName: string): void {
  applyFontPreferenceRuntime({
    font: fontName,
    allowedFonts: FONTS,
    fallback: "silkscreen",
    key: FONT_KEY,
    documentElement: document.documentElement,
    select: fontSelect,
    storage: localStorage
  });
}

function initFont(): void {
  initChoicePreferenceRuntime({ storage: localStorage, key: FONT_KEY, fallback: "silkscreen", allowed: FONTS, select: fontSelect, onApply: setFont });
}

function makeCopyButton(getText: () => string): HTMLButtonElement {
  return makeCopyButtonRuntime({
    document,
    getText,
    copyText: (text: unknown) => copyTextToClipboardRuntime(text, { document, navigator, errorTarget: diagBox })
  });
}

function initPanelCopyButtons(): void {
  installPanelCopyButtonsRuntime({
    diagBox,
    document,
    makeCopyButton,
    usefulValueIds: DEFAULT_PANEL_COPY_VALUE_IDS_RUNTIME
  });
}

function applyDiag(presentation: { diagClass?: unknown; diagText?: unknown } | null | undefined): void {
  applyDiagPresentationRuntime(diagBox, presentation);
}

function applyDiagKind(presentation: {
  diagClass?: unknown;
  diagText?: unknown;
  message?: unknown;
  text?: unknown;
} | null | undefined): void {
  applyDiag(normalizeDiagKindPresentationRuntime(presentation));
}

function renderCurrentNetStatusView(): void {
  renderNetStatusViewRuntime({
    stateNet: state.net,
    isAuthenticated: isNetAuthenticated(),
    elements: netStatusElements
  });
}

function updateNetSessionStat(): void {
  renderNetSessionUiRuntime({
    stateNet: state.net,
    isAuthenticated: isNetAuthenticated(),
    elements: netStatusElements
  });
}

function updatePauseLoopUi(): void {
  renderPauseLoopUiRuntime({ paused: state.simPaused, pauseLoopButton, statSimLoop });
}

function setSimPaused(paused: boolean, reason = ""): void {
  applyPauseLoopStateRuntime({
    backgroundSyncTarget: state.net,
    nowMs: () => performance.now(),
    paused,
    state
  });
  updatePauseLoopUi();
  const diag = pauseLoopReasonDiagRuntime(reason);
  if (diag) {
    applyDiag(diag);
  }
}

function updateIntroPhaseUi(): void {
  const model = renderIntroPhaseUiRuntime(state.net.introPhase, { statIntroPhase, netIntroPhaseSelect });
  state.net.introPhase = model.normalized;
}

function updateNetAuthButton(): void {
  renderCurrentNetStatusView();
}

function setNetStatus(level: string, text: string): void {
  applyNetStatusRuntime({
    stateNet: state.net,
    level,
    text,
    isAuthenticated: isNetAuthenticated(),
    elements: netStatusElements
  });
}

function netOnlineStatusText(): string {
  return deriveNetOnlineStatusTextRuntime({
    characterName: state.net.characterName,
    username: state.net.username
  });
}

function isServerConnectionBroken(): boolean {
  return shouldShowInGameServerBrokenRuntime({
    isAuthenticated: isNetAuthenticated(),
    statusLevel: state.net.statusLevel
  });
}

function markServerReconnected(): void {
  markServerReconnectedStateRuntime({
    durationMs: NET_RECONNECTED_MESSAGE_MS,
    nowMs: performance.now(),
    state
  });
  state.net.backgroundSyncPaused = false;
  setNetStatus("online", netOnlineStatusText());
}

function clearTransientReconnectMessageOnCommand(): void {
  clearTransientReconnectMessageOnCommandRuntime(state);
}

function blockGameplayForBrokenServer(): boolean {
  const diag = brokenServerGameplayBlockDiagRuntime({
    isServerConnectionBroken: isServerConnectionBroken(),
    sessionStarted: state.sessionStarted
  });
  if (!diag) {
    return false;
  }
  applyDiag(diag);
  return true;
}

function applyNetStatusPresentation(presentation: { level: string; text: string }): void {
  applyNetStatusPresentationRuntime({
    stateNet: state.net,
    presentation,
    isAuthenticated: isNetAuthenticated(),
    elements: netStatusElements
  });
}

let netActivityPulseTimer = 0;
function pulseNetIndicator(): void {
  pulseNetIndicatorRuntime({
    indicator: topNetIndicator,
    currentTimer: netActivityPulseTimer,
    timeoutMs: NET_ACTIVITY_PULSE_MS,
    setTimer: (nextTimer) => {
      netActivityPulseTimer = Number(nextTimer || 0) | 0;
    }
  });
}

function upsertNetProfileFromInputs(): void {
  upsertNetProfileFromControlsRuntime({
    controls: currentNetProfileControls(),
    ...NET_PROFILE_STORAGE,
    accountSelect: netAccountSelect,
    maxEntries: 12
  });
}

function recordBackgroundNetFailure(err: unknown, context: string): void {
  recordBackgroundFailureRuntime(state.net, {
    err,
    context,
    nowMs: Date.now(),
    windowMs: NET_BACKGROUND_FAIL_WINDOW_MS,
    maxFailures: NET_BACKGROUND_FAIL_MAX,
    setStatus: setNetStatus
  });
}

function currentNetProfileControls(): {
  apiBaseInput: HTMLInputElement | null;
  usernameInput: HTMLInputElement | null;
  passwordInput: HTMLInputElement | null;
  characterNameInput: HTMLInputElement | null;
  emailInput: HTMLInputElement | null;
} {
  return {
    apiBaseInput: netApiBaseInput,
    usernameInput: netUsernameInput,
    passwordInput: netPasswordInput,
    characterNameInput: netCharacterNameInput,
    emailInput: netEmailInput
  };
}

function applyProfileToNetControls(profile: NetProfile): boolean {
  return applyNetProfileToControlsRuntime({
    profile,
    controls: currentNetProfileControls(),
    selectedKeyStorageKey: NET_PROFILE_STORAGE.selectedKeyStorageKey
  });
}

function refreshNetAccountSelect(): NetProfile[] {
  return populateNetAccountSelectRuntime({ accountSelect: netAccountSelect, ...NET_PROFILE_STORAGE });
}

function netAccountSelectionBinding(): {
  accountSelect: HTMLSelectElement | null;
  loadProfiles: () => NetProfile[];
  profileKey: (profile: { apiBase?: string; username?: string }) => string;
  applyProfile: (profile: NetProfile) => void;
} {
  return {
    accountSelect: netAccountSelect,
    loadProfiles: () => loadNetProfilesFromStorage(NET_PROFILE_STORAGE.storageKey),
    profileKey: profileKeyRuntime,
    applyProfile: (profile) => {
      applyProfileToNetControls(profile);
    }
  };
}

function resetBackgroundFailures(): void {
  const wasBroken = isServerConnectionBroken();
  resetBackgroundFailureState(state.net);
  if (wasBroken && isNetAuthenticated()) {
    markServerReconnected();
  }
}

function updateCriticalRecoveryStat(): void {
  renderCriticalRecoveryStatRuntime(statCriticalRecoveries, state.net);
}

async function netRequest(route: string, init: RequestInit = {}, auth = true): Promise<NetJsonBody> {
  const requestOptions = managedNetRequestOptionsRuntime({
    apiBase: String(state.net.apiBase || ""),
    route: String(route || ""),
    init,
    auth,
    token: String(state.net.token || ""),
    runtimeProfile: String(state.runtimeProfile || RUNTIME_PROFILE_CANONICAL_STRICT),
    runtimeExtensions: runtimeExtensionsSummary(state.runtimeExtensions)
  });
  return performManagedNetRequest({
    ...requestOptions,
    onPulse: pulseNetIndicator,
    onUnauthorized: () => {
      clearNetSessionState(state.net);
      state.net.introPhase = "post_intro";
      updateNetSessionStat();
      applyNetStatusPresentation(netStatusSessionExpiredRuntime());
    }
  });
}

async function netGetIntroPhase(): Promise<WorldRuntimeJson | null> {
  const { out, phase } = await requestIntroPhaseRuntime(state.net.introPhase, netRequest);
  state.net.introPhase = phase;
  updateIntroPhaseUi();
  return out;
}

async function netSetIntroPhase(phase: unknown): Promise<WorldRuntimeJson | null> {
  const { out, phase: next } = await setIntroPhaseRuntime(phase, netRequest);
  state.net.introPhase = next;
  updateIntroPhaseUi();
  return out;
}

async function netEnsureCharacter(): Promise<void> {
  const out = await performNetEnsureCharacter(
    String(netCharacterNameInput?.value || state.net.characterName || "Avatar"),
    netRequest
  );
  state.net.characterId = out.characterId;
  state.net.characterName = out.characterName;
}

async function netWorldObjectActorId(): Promise<string> {
  if (!String(state.net.characterId || "").trim()) {
    await netEnsureCharacter();
  }
  const actorId = String(state.net.characterId || "").trim();
  if (!actorId) {
    throw new Error("No character is selected for world inventory.");
  }
  return actorId;
}

function netSnapshotRoute(): string {
  return snapshotRouteForCharacterRuntime(state.net.characterId);
}

function applyLoadedSimSnapshot(loaded: SimSnapshotRuntime): void {
  const fallbackPartySize = Array.isArray(state.sim.partyMembers) ? state.sim.partyMembers.length : 1;
  const patch = loadedSimSnapshotPatchRuntime(loaded, fallbackPartySize);
  state.sim = patch.sim;
  state.queue = patch.queue;
  state.commandLog = patch.commandLog;
  state.accMs = patch.accMs;
  resetMoveInputThrottleRuntime(state);
  state.avatarLastMoveTick = patch.avatarLastMoveTick;
  state.avatarWalkAnimUntilMs = patch.avatarWalkAnimUntilMs;
  state.interactionProbeTile = patch.interactionProbeTile;
}

async function netLogin(): Promise<void> {
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
      applyLoadedSimSnapshot(loaded);
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
  try {
    await netSyncInventoryProjection();
  } catch (_err) {
    // Inventory also syncs when the session starts; avoid failing login for a transient inventory poll.
  }
  try {
    await netSyncAuthoritativeWorldObjectsMeta();
  } catch (_err) {
    // The next object query will refresh pickup respawn metadata.
  }
  maybeStartSessionFromSkipIntro();
  return out;
}

async function netSetEmail(): ReturnType<typeof performNetSetEmail> {
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

async function netSendEmailVerification(): ReturnType<typeof performNetSendEmailVerification> {
  return performNetSendEmailVerification({
    ensureAuth: netLogin,
    isAuthenticated: () => !!state.net.token,
    request: netRequest,
    setStatus: setNetStatus
  });
}

async function netVerifyEmail(): ReturnType<typeof performNetVerifyEmail> {
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

async function netRecoverPassword(): ReturnType<typeof performNetRecoverPassword> {
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

async function netChangePassword(): ReturnType<typeof performNetChangePassword> {
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

function netLogout(): void {
  void netLogoutAndPersist();
}

async function netLogoutAndPersist(): Promise<void> {
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
  applyNetStatusPresentation(netStatusNotLoggedInRuntime());
  const logoutDiag = netLogoutDiagRuntime({ saveErr, leaveErr, errorMessage: errorMessageRuntime });
  applyDiag(logoutDiag);
  updateNetAuthButton();
}

function netSaveSnapshotDeps(setStatus: (level: string, text: string) => void): SnapshotSaveDeps {
  return {
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
    setStatus
  };
}

async function netSaveSnapshot(): Promise<SnapshotRuntimePayload> {
  return performNetSaveSnapshot(netSaveSnapshotDeps(setNetStatus));
}

async function netAutosaveSnapshot(): Promise<void> {
  await performNetAutosaveSnapshotRuntime(state.net, netSaveSnapshotDeps(() => {}));
}

async function netLoadSnapshot(): Promise<SnapshotRuntimePayload> {
  const out = await performNetLoadSnapshot({
    ensureAuth: netLogin,
    isAuthenticated: () => !!state.net.token,
    request: netRequest,
    snapshotRoute: netSnapshotRoute,
    decodeSnapshot: decodeSimSnapshotBase64Runtime,
    applyLoadedSim: (loaded) => {
      applyLoadedSimSnapshot(loaded);
    },
    resetBackgroundFailures,
    setStatus: setNetStatus
  });
  await netSyncInventoryProjection();
  await netSyncAuthoritativeWorldObjectsMeta();
  return out;
}

function collectWorldItemsForMaintenance(): CriticalMaintenanceWorldItem[] {
  return collectWorldItemsForMaintenanceFromLayer(state.objectLayer);
}

async function netRunCriticalMaintenance(opts: { silent?: boolean } = {}): Promise<CriticalMaintenanceEvent[]> {
  return runCriticalMaintenanceRuntime(state.net, opts, {
    currentTick: () => state.sim.tick >>> 0,
    collectWorldItems: collectWorldItemsForMaintenance,
    login: netLogin,
    request: netRequest,
    resetBackgroundFailures,
    updateCriticalRecoveryStat,
    setStatus: setNetStatus,
    setDiag: (kind, text) => {
      applyDiag(criticalMaintenanceDiagRuntime(kind, text));
    }
  });
}

async function netFetchWorldObjectsAtCell(x: number, y: number, z: number): Promise<WorldRuntimeJson | null> {
  if (!isNetAuthenticated()) {
    return null;
  }
  const out = await requestWorldObjectsAtCell(x, y, z, netRequest);
  applyAuthoritativeHiddenWorldObjectsFromMeta(out?.meta);
  applyAuthoritativeWorldObjectsToLayer(out?.objects);
  return out;
}

async function netSendPresenceHeartbeat(): Promise<void> {
  await performPresenceHeartbeat(presenceHeartbeatPayloadRuntime({
    avatarFacingDx: state.avatarFacingDx,
    avatarFacingDy: state.avatarFacingDy,
    characterName: state.net.characterName,
    mapX: state.sim.world.map_x,
    mapY: state.sim.world.map_y,
    mapZ: state.sim.world.map_z,
    mode: state.movementMode,
    sessionId: state.net.sessionId,
    tick: state.sim.tick
  }), {
    isAuthenticated: isNetAuthenticated,
    isSessionStarted: () => state.sessionStarted,
    request: netRequest,
    resetBackgroundFailures
  });
}

async function netLeavePresence(): Promise<void> {
  await performPresenceLeave(state.net.sessionId, {
    isAuthenticated: isNetAuthenticated,
    request: netRequest,
    resetBackgroundFailures
  });
}

async function netPollPresence(): Promise<void> {
  const presenceState = state as AppPresenceStateView;
  await performPresencePoll({
    isAuthenticated: isNetAuthenticated,
    request: netRequest,
    resetBackgroundFailures,
    isPollInFlight: () => presenceState.net.presencePollInFlight,
    setPollInFlight: (inFlight) => {
      presenceState.net.presencePollInFlight = !!inFlight;
    },
    setRemotePlayers: (players) => {
      presenceState.net.remotePlayers = Array.isArray(players) ? players : [];
    },
    selfIdentity: () => ({
      sessionId: state.net.sessionId,
      userId: state.net.userId,
      username: state.net.username
    })
  });
}

function applyAuthoritativeNpcStates(rows: unknown): void {
  const presenceState = state as AppPresenceStateView;
  if (!presenceState.entityLayer || !Array.isArray(presenceState.entityLayer.entries)) {
    return;
  }
  applyAuthoritativeNpcStatesRuntime(
    presenceState.entityLayer.entries,
    authoritativeNpcStateRowsFromJsonRuntime(rows),
    performance.now()
  );
}

function applyAuthoritativeNpcOverrides(overrides: unknown): void {
  applyAuthoritativeNpcStates(overrides);
}

function applyAuthoritativeWorldClock(clock: WorldClockPayload | null): void {
  const extras = authoritativeWorldClockExtrasRuntime(clock, state.net.introPhase);
  applyAuthoritativeWorldClockToSim(clock, (next) => {
    state.sim.tick = next.tick;
    const w = state.sim.world;
    w.time_m = next.time_m;
    w.time_h = next.time_h;
    w.date_d = next.date_d;
    w.date_m = next.date_m;
    w.date_y = next.date_y;
  });
  state.net.introPhase = extras.introPhase;
  updateIntroPhaseUi();
  applyAuthoritativeNpcStates(extras.npcRows);
}

async function netPollWorldClock(): Promise<void> {
  const presenceState = state as AppPresenceStateView;
  await performWorldClockPoll({
    isAuthenticated: isNetAuthenticated,
    request: netRequest,
    resetBackgroundFailures,
    isPollInFlight: () => presenceState.net.clockPollInFlight,
    setPollInFlight: (inFlight) => {
      presenceState.net.clockPollInFlight = !!inFlight;
    },
    applyClock: applyAuthoritativeWorldClock
  });
}

async function netProbeReconnect(): Promise<void> {
  await performReconnectProbeRuntime({
    isAuthenticated: isNetAuthenticated,
    isServerConnectionBroken,
    markServerReconnected,
    pollPresence: netPollPresence,
    pollWorldClock: netPollWorldClock,
    requestHealth: () => netRequest("/health", { method: "GET" }, false),
    state
  });
}

function startAuthoritativeConversationFromPayload(
  payload: unknown,
  actor: LegacyTalkActor,
  tileId: number
): void {
  const session = payload && typeof payload === "object"
    ? payload as NonNullable<AuthoritativeConversationPayload["conversation_session"]>
    : {};
  const sessionId = String(session.session_id || "").trim();
  const targetName = sanitizeLegacyHudLabelText(String(session.target_name || canonicalTalkSpeakerForTile(tileId) || "Unknown")) || "Unknown";
  const desc = sanitizeLegacyHudLabelText(String(session.desc || "").trim() || targetName);
  const openingLines = Array.isArray(session.opening_lines)
    ? session.opening_lines.map((line) => String(line || "").trim()).filter(Boolean)
    : [];
  const equipSlots = legacyEquipmentSlotsForTalkActor(actor);
  const { openingBlock } = beginLegacyConversationSession(state, {
    actorEntityId: Number(actor?.id) | 0,
    authoritative: true,
    desc,
    equipmentSlots: equipSlots,
    formatYouSeeLine,
    inputOpcode: Number(session.stop_opcode) | 0,
    openingLines,
    portraitTile: tileId,
    sessionId,
    statusDisplay: LEGACY_STATUS_DISPLAY.CMD_9E,
    targetName,
    targetObjNum: Number(session.npc_id) | 0,
    targetObjType: Number(actor?.type) | 0,
    pc: Number(session.next_pc) | 0
  });
  const pagedOpening = startLegacyConversationPagination(openingBlock);
  if (!pagedOpening) {
    for (const line of openingBlock) {
      pushLedgerMessage(line);
    }
    pushLegacyConversationPrompt();
  }
}

async function netStartConversation(actor: LegacyTalkActor, tx: number, ty: number, tz: number) {
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
  const payload = out as AuthoritativeConversationPayload;
  startAuthoritativeConversationFromPayload(payload.conversation_session || {}, actor, tileId);
  const diag = legacyTalkAuthoritativeStartedPresentationRuntime({
    targetName: payload.conversation_session?.target_name,
    tx,
    ty,
    tz
  });
  applyDiagKind(diag);
}

async function netReplyConversation(typed: unknown) {
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

function setAccountModalOpen(open: boolean): void {
  setModalOpenRuntime(netAccountModal, !!open);
}

function setNetPanelActionDiag(kind: "ok" | "warn", text: string): void {
  applyDiag(netPanelActionDiagRuntime(kind, text));
}

function initNetPanel(): void {
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
  applyNetPanelInitialStateRuntime({
    maintenanceToggle: netMaintenanceToggle,
    prefs,
    stateNet: state.net
  });
  applyNetStatusPresentation(netStatusNotLoggedInRuntime());

  bindAccountProfileSelectionRuntime(accountBinding);
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
  bindNetPanelModalButtonsRuntime({
    backdrop: netAccountModalBackdrop,
    closeButton: netAccountCloseButton,
    onBeforeOpen: refreshNetAccountSelect,
    openButton: netAccountOpenButton,
    setOpen: setAccountModalOpen
  });

  bindNetLoginButtonRuntime({
    button: netLoginButton,
    characterName: () => state.net.characterName,
    errorMessage: errorMessageRuntime,
    isAuthenticated: isNetAuthenticated,
    login: netLogin,
    logout: netLogout,
    setAccountModalOpen,
    setStatus: setNetStatus,
    username: () => state.net.username,
    setDiag: (diag) => {
      applyDiag(diag);
    }
  });
  if (prefs.autoLogin === "on" && !isNetAuthenticated()) {
    (async () => {
      try {
        applyNetStatusPresentation(netStatusAutoLoginRuntime());
        await netLogin();
        setAccountModalOpen(false);
        applyDiag(netAutoLoginSuccessDiagRuntime(state.net.username, state.net.characterName));
      } catch (err) {
        const failure = netAutoLoginFailureRuntime(errorMessageRuntime(err));
        setNetStatus(failure.statusLevel, failure.statusText);
        applyDiag(failure);
      }
    })();
  }
  bindNetPanelActionButtonRuntime({
    button: netRecoverButton,
    run: netRecoverPassword,
    setStatus: setNetStatus,
    setDiag: setNetPanelActionDiag,
    okText: (out) => `Recovery email sent for ${out?.user?.username || "user"}.`,
    errorStatusPrefix: "Recovery failed",
    errorDiagPrefix: "Password recovery failed"
  });
  bindNetPanelActionButtonRuntime({
    button: netSetEmailButton,
    run: netSetEmail,
    setStatus: setNetStatus,
    setDiag: setNetPanelActionDiag,
    okText: (out) => {
      const verified = !!out?.user?.email_verified;
      return verified
        ? `Recovery email set and verified (${out?.user?.email || ""}).`
        : `Recovery email set (${out?.user?.email || ""}). Verification required.`;
    },
    errorStatusPrefix: "Set email failed",
    errorDiagPrefix: "Set email failed"
  });
  bindNetPanelActionButtonRuntime({
    button: netSendVerifyButton,
    run: netSendEmailVerification,
    setStatus: setNetStatus,
    setDiag: setNetPanelActionDiag,
    okText: "Verification code sent to recovery email.",
    errorStatusPrefix: "Send code failed",
    errorDiagPrefix: "Send code failed"
  });
  bindNetPanelActionButtonRuntime({
    button: netVerifyEmailButton,
    run: netVerifyEmail,
    setStatus: setNetStatus,
    setDiag: setNetPanelActionDiag,
    okText: "Recovery email verified.",
    errorStatusPrefix: "Verify email failed",
    errorDiagPrefix: "Verify email failed"
  });
  bindNetPanelActionButtonRuntime({
    button: netChangePasswordButton,
    run: netChangePassword,
    setStatus: setNetStatus,
    setDiag: setNetPanelActionDiag,
    okText: "Account password updated.",
    errorStatusPrefix: "Change password failed",
    errorDiagPrefix: "Change password failed"
  });
  bindRemoteSnapshotButtonRuntime({
    button: netSaveButton,
    run: netSaveSnapshot,
    updateSessionStat: updateNetSessionStat,
    success: () => remoteSnapshotSavedDiagRuntime(state.sim.tick),
    failure: (err) => remoteSnapshotSaveFailureRuntime(errorMessageRuntime(err)),
    setStatus: setNetStatus,
    setDiag: (diag) => {
      applyDiag(diag);
    }
  });
  bindRemoteSnapshotButtonRuntime({
    button: netLoadButton,
    run: netLoadSnapshot,
    updateSessionStat: updateNetSessionStat,
    success: (out) => remoteSnapshotLoadedDiagRuntime(snapshotSavedTickRuntime(out)),
    failure: (err) => remoteSnapshotLoadFailureRuntime(errorMessageRuntime(err)),
    setStatus: setNetStatus,
    setDiag: (diag) => {
      applyDiag(diag);
    }
  });
  bindCriticalMaintenanceButtonRuntime({
    button: netMaintenanceButton,
    errorMessage: errorMessageRuntime,
    run: () => netRunCriticalMaintenance({ silent: false }),
    setStatus: setNetStatus,
    setDiag: (diag) => {
      applyDiag(diag);
    }
  });
  bindPauseLoopButtonRuntime({
    button: pauseLoopButton,
    isPaused: () => state.simPaused,
    setPaused: setSimPaused
  });
  bindAudioMuteButtonRuntime({
    button: audioMuteButton,
    toggle: () => {
      toggleAudioMute();
    }
  });
  bindIntroPhaseButtonRuntime({
    button: netIntroPhaseButton,
    currentPhase: () => state.net.introPhase,
    errorMessage: errorMessageRuntime,
    isAuthenticated: isNetAuthenticated,
    requestedPhase: () => netIntroPhaseSelect?.value,
    setIntroPhase: netSetIntroPhase,
    setStatus: setNetStatus,
    setDiag: (diag) => {
      applyDiag(diag);
    }
  });
}

function setGrid(enabled: boolean): void {
  applyBooleanTogglePreferenceStateRuntime({
    enabled,
    key: GRID_KEY,
    select: gridToggle,
    state,
    stateKey: "showGrid",
    storage: localStorage
  });
}

function setOverlayDebug(enabled: boolean): void {
  applyBooleanTogglePreferenceStateRuntime({
    enabled,
    key: DEBUG_OVERLAY_KEY,
    select: debugOverlayToggle,
    state,
    stateKey: "showOverlayDebug",
    storage: localStorage
  });
}

function setAnimationMode(mode: string): void {
  applyAnimationModePreferenceStateRuntime({
    mode,
    currentTick: state.sim.tick,
    key: ANIMATION_KEY,
    select: animationToggle,
    state,
    storage: localStorage
  });
}

function setPaletteFxMode(enabled: boolean): void {
  applyPaletteFxPreferenceStateRuntime({
    enabled,
    key: PALETTE_FX_KEY,
    select: paletteFxToggle,
    state: state as AnimationPaletteState,
    storage: localStorage
  });
}

function setMovementMode(mode: string): void {
  applyMovementModePreferenceStateRuntime({
    mode,
    key: MOVEMENT_MODE_KEY,
    select: movementModeToggle,
    statAvatarState,
    state,
    storage: localStorage
  });
}

function setLegacyFramePreview(enabled: boolean): void {
  applyLegacyFramePreviewPreferenceRuntime({
    applyLayout: applyLegacyFrameLayout,
    documentElement: document.documentElement,
    enabled,
    key: LEGACY_FRAME_PREVIEW_KEY,
    select: capturePreviewToggle,
    storage: localStorage
  });
}

function setLegacyScaleMode(mode: string): void {
  applyLegacyScaleModePreferenceStateRuntime({
    allowed: LEGACY_SCALE_MODES,
    applyLayout: applyLegacyFrameLayout,
    fallback: "fit",
    key: LEGACY_SCALE_MODE_KEY,
    mode,
    select: legacyScaleModeToggle,
    state,
    stateKey: "legacyScaleMode",
    storage: localStorage
  });
}

function cycleLegacyScaleMode(step: number): void {
  setLegacyScaleMode(nextLegacyScaleModeRuntime(state.legacyScaleMode, step, LEGACY_SCALE_MODES, "fit"));
}

function tryLookAtCell(sim: AppSimState, tx: number, ty: number): boolean {
  const talkState = state as LegacyTalkSessionStateView;
  const mapCtx = talkState.mapCtx;
  if (!mapCtx) {
    return false;
  }
  const result = resolveLookTargetAtCellRuntime({
    world: sim.world,
    objectLayer: talkState.objectLayer,
    entityEntries: talkState.entityLayer?.entries,
    mapTileAt: (x, y, z) => mapCtx.tileAt(x, y, z),
    sim,
    tx,
    ty,
    avatarEntityId: AVATAR_ENTITY_ID,
    deps: WORLD_OBJECT_LOOKUP_DEPS
  });
  const sentence = result.ok ? canonicalLookSentenceForTile(result.tileId) : "";
  const presentation = legacyLookPresentationRuntime(result, sentence);
  applyDiagKind(presentation);
  for (const line of presentation.ledgerLines) {
    pushLedgerMessage(line);
  }
  showLegacyLedgerPrompt();
  return presentation.ok;
}

function tryTalkAtCell(sim: AppSimState, tx: number, ty: number): boolean {
  const talkState = state as LegacyTalkSessionStateView;
  const target = resolveTalkTargetAtCellRuntime({
    world: sim.world,
    entityEntries: talkState.entityLayer?.entries,
    tx,
    ty,
    avatarEntityId: AVATAR_ENTITY_ID
  });
  const tz = target.z;
  if (target.ok === false) {
    const presentation = legacyTalkFailurePresentationRuntime(target);
    applyDiagKind(presentation);
    for (const line of presentation.ledgerLines) {
      pushLedgerMessage(line);
    }
    showLegacyLedgerPrompt();
    return presentation.ok;
  }
  const actor = target.actor;
  if (isNetAuthenticated()) {
    const diag = legacyTalkAuthoritativeStartPresentationRuntime(actor.id);
    applyDiagKind(diag);
    netStartConversation(actor, tx, ty, tz).catch((err: unknown) => {
      const failure = legacyTalkAsyncFailurePresentationRuntime(errorMessageRuntime(err));
      applyDiagKind(failure);
      pushLedgerMessage("No one responds.");
      showLegacyLedgerPrompt();
    });
    return true;
  }
  const haveConverse = (talkState.converseArchiveA instanceof Uint8Array) || (talkState.converseArchiveB instanceof Uint8Array);
  const tileId = ((Number(actor.baseTile) | 0) + (Number(actor.frame) | 0)) & 0xffff;
  const actorId = Number(actor.id) | 0;
  const resolvedConversation = resolveConversationScriptForActor(actor as LegacyConversationActor, tileId);
  const script = resolvedConversation.valid && resolvedConversation.script instanceof Uint8Array
    ? resolvedConversation.script
    : null;
  const scriptAvailable = script instanceof Uint8Array;
  const header = scriptAvailable
    ? resolvedConversation.header
    : { name: "", desc: "", mainPc: 0 };
  const knownName = talkState.legacyConversationKnownNames[String(actorId)] || "";
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
    const diag = legacyTalkFallbackPresentationRuntime(summary);
    applyDiagKind(diag);
  }
  const equipSlots = legacyEquipmentSlotsForTalkActor(actor as LegacyTalkActor);
  const renderedOpeningLines: string[] = [];
  const normalizedOpening = (Array.isArray(openingLines) ? openingLines : [])
    .map((line) => String(line || "").trim())
    .filter(Boolean);
  for (const rawLine of normalizedOpening) {
    const line = renderConversationMacros(String(rawLine || "").trim(), vmContext);
    if (line) {
      renderedOpeningLines.push(line);
    }
  }
  let fallbackOpeningLine = "";
  if (!renderedOpeningLines.length) {
    const fallback = canonicalTalkFallbackGreeting(resolvedConversation.objNum, speaker, vmContext);
    if (fallback) {
      fallbackOpeningLine = `"${fallback}"`;
    }
  }
  /*
    Canonical UI behavior: entering talk routes status panel to inspect/talk (0x9E).
    Canonical C_27A1_02D9 path: paperdoll/inventory is shown in talk view only
    when `showInven` is true (derived from real EQUIP objects on the actor).
  */
  const { openingBlock } = beginLegacyConversationSession(state as LegacyConversationState, {
    actorEntityId: actorId,
    desc,
    equipmentSlots: equipSlots,
    formatYouSeeLine,
    inputOpcode: scriptAvailable ? (Number(openingResult.stopOpcode) | 0) : 0,
    openingLines: renderedOpeningLines,
    portraitTile: tileId,
    script: scriptAvailable ? script : null,
    rules,
    statusDisplay: LEGACY_STATUS_DISPLAY.CMD_9E,
    targetName: speaker,
    targetObjNum: talkObjNum,
    targetObjType: Number(actor.type) | 0,
    vmContext,
    pc: scriptAvailable ? (Number(openingResult.stopPc) | 0) : -1
  });
  if (fallbackOpeningLine) {
    if (normalizedOpening.length > 0) {
      openingBlock.push("");
    }
    openingBlock.push(fallbackOpeningLine);
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
  const diag = legacyTalkStartedPresentationRuntime({
    actorId: actor.id,
    converseLoaded: haveConverse,
    rulesCount: rules.length,
    showInventory: state.legacyConversationShowInventory,
    speaker,
    targetObjNum: resolvedConversation.objNum,
    targetType: actor.type,
    tx,
    ty,
    tz,
    valid: resolvedConversation.valid
  });
  applyDiagKind(diag);
  return true;
}

async function netSyncInventoryProjection() {
  if (!isNetAuthenticated() || !state.sim) {
    return null;
  }
  const actorId = await netWorldObjectActorId();
  const out = await netRequest(`/api/world/inventory?actor_id=${encodeURIComponent(actorId)}`, {
    method: "GET"
  }, true);
  applyAuthoritativeHiddenWorldObjectsFromMeta(out?.meta);
  applyInventoryProjectionFromServerObjectsRuntime(state.sim, out?.objects || []);
  return out;
}

async function netSyncAuthoritativeWorldObjectsMeta(): Promise<void> {
  if (!isNetAuthenticated() || !state.sim) {
    return;
  }
  const out = await requestWorldObjectsAroundRuntime({
    x: state.sim.world.map_x | 0,
    y: state.sim.world.map_y | 0,
    z: state.sim.world.map_z | 0,
    radius: 12,
    limit: 2048
  }, netRequest);
  applyAuthoritativeHiddenWorldObjectsFromMeta(out?.meta);
  applyAuthoritativeWorldObjectsToLayer(out?.objects);
}

async function netTakeWorldObject(
  obj: InventoryObjectRuntime & { frame: number },
  tx: number,
  ty: number,
  tz: number
) {
  const actorId = await netWorldObjectActorId();
  const out = await requestTakeWorldObjectRuntime({
    actorId,
    actorX: state.sim.world.map_x,
    actorY: state.sim.world.map_y,
    actorZ: state.sim.world.map_z,
    target: obj
  }, netRequest);
  applyAuthoritativeHiddenWorldObjectsFromMeta(out?.meta);
  const projection = takeProjectionFromResponseRuntime(out, obj);
  const item = projection.inventory_item;
  if (projection.remove_taken_object_key && state.objectLayer) {
    state.objectLayer.removeRuntimeEntryByAuthoritativeKey(projection.remove_taken_object_key);
  }
  if (projection.hide_source) {
    if (state.objectLayer) {
      state.objectLayer.removeRuntimeEntryByAuthoritativeKey(projection.remove_source_object_key);
    }
    markAuthoritativeWorldObjectHidden(
      projection.source_object_key,
      projection.source_respawn_due_at_ms
    );
  }
  const pickup = applyTakeProjectionToInventoryRuntime(state.sim, projection, obj);
  const diag = legacyGetPickedPresentationRuntime(item, tx, ty, tz, pickup.inventoryKey, pickup.count);
  applyDiagKind(diag);
  return out;
}

function applyAuthoritativeWorldObjectsToLayer(objects: readonly unknown[] | null | undefined): void {
  if (!state.objectLayer) {
    return;
  }
  const actions = objectLayerProjectionActionsFromServerObjectsRuntime(
    objects,
    state.objectLayer.baseTiles,
    isAuthoritativeWorldObjectHidden
  );
  for (const action of actions) {
    if (action.kind === "remove") {
      state.objectLayer.removeRuntimeEntryByAuthoritativeKey(action.object_key);
      continue;
    }
    state.objectLayer.upsertRuntimeEntry(action.entry);
  }
}

function queueDropThrowEffect(args: {
  fromX: number;
  fromY: number;
  landObject: WorldRuntimeJson["target"] | null | undefined;
  toX: number;
  toY: number;
  z: number;
}): void {
  const result = queueDropThrowEffectRuntime({
    ...args,
    currentEffects: state.dropThrowEffects,
    durationMs: DROP_THROW_EFFECT_MS,
    nowMs: performance.now()
  });
  for (const landObject of result.landedObjects) {
    applyAuthoritativeWorldObjectsToLayer([landObject]);
  }
  state.dropThrowEffects = result.effects;
}

function isTileIgnoredForGet(tileId: number): boolean {
  return legacyGetTileIgnoredRuntime(tileId, state.tileFlags2);
}

function isTerrainDamageTileForGet(tileId: number): boolean {
  return legacyGetTerrainDamageTileRuntime(tileId, state.terrainType);
}

async function netGetAtCell(sim: AppSimState, tx: number, ty: number): Promise<boolean> {
  return performNetGetAtCellRuntime({
    applyDiag: applyDiagKind,
    fetchWorldObjectsAtCell: netFetchWorldObjectsAtCell,
    isTerrainDamageTile: isTerrainDamageTileForGet,
    isTileIgnored: isTileIgnoredForGet,
    lookupDeps: WORLD_OBJECT_LOOKUP_DEPS,
    sim,
    takeWorldObject: (obj, x, y, z) => netTakeWorldObject(obj as InventoryObjectRuntime & { frame: number }, x, y, z),
    tx,
    ty
  });
}

function pushLegacyDropTargetPrompt(item: WorldRuntimeInventoryObject | null | undefined): void {
  const lines = legacyDropTargetPromptLinesRuntime(
    item,
    state.lookStringEntries as LegacyLookStringEntryRuntime[] | null,
    state.tileFlags2,
    item ? inventoryKeyForObjectRuntime(item) : ""
  );
  for (const line of lines) {
    pushLedgerMessage(line);
  }
  showLegacyLedgerPrompt();
}

async function netDropInventoryObject(sim: AppSimState, tx: number, ty: number) {
  const actorId = await netWorldObjectActorId();
  return performNetDropInventoryObjectRuntime({
    actorId,
    applyDiag: applyDiagKind,
    legacyHudSelection: state.legacyHudSelection,
    netRequest,
    queueDropThrowEffect,
    sim,
    syncInventoryProjection: netSyncInventoryProjection,
    tx,
    ty
  });
}

function tryGetAtCell(sim: AppSimState, tx: number, ty: number): boolean {
  if (isNetAuthenticated()) {
    const diag = legacyGetCheckingPresentationRuntime(tx, ty, sim.world.map_z | 0);
    applyDiagKind(diag);
    void netGetAtCell(sim, tx, ty).catch((err: unknown) => {
      const failure = legacyGetAsyncFailurePresentationRuntime(errorMessageRuntime(err));
      applyDiagKind(failure);
    });
    return true;
  }
  const interactionState = state as GameplayInteractionStateView;
  const tz = sim.world.map_z | 0;
  const objects = interactionState.objectLayer
    ? targetObjectsFromObjectLayerEntriesRuntime(interactionState.objectLayer.objectsAt(tx | 0, ty | 0, tz))
    : [];
  const target = resolveLegacyGetSelectionRuntime({
    world: sim.world,
    objects,
    sim,
    tx,
    ty,
    deps: {
      ...WORLD_OBJECT_LOOKUP_DEPS,
      isTerrainDamageTile: isTerrainDamageTileForGet,
      isTileIgnored: isTileIgnoredForGet
    }
  });
  if (target.ok === false && target.reason === "out_of_range") {
    const diag = legacyGetFailurePresentationRuntime(target.reason, target.selected, tx, ty, tz);
    applyDiagKind(diag);
    return false;
  }
  if (target.ok === false) {
    const diag = legacyGetFailurePresentationRuntime(target.reason, target.selected, tx, ty, tz);
    applyDiagKind(diag);
    return false;
  }
  const obj = target.object;
  const pickup = pickObjectIntoInventoryRuntime(sim, obj, obj);
  const diag = legacyGetPickedPresentationRuntime(obj, tx, ty, tz, pickup.inventoryKey, pickup.count);
  applyDiagKind(diag);
  return true;
}

function tryAttackAtCell(sim: AppSimState, tx: number, ty: number): boolean {
  const interactionState = state as GameplayInteractionStateView;
  const target = resolveAttackTargetAtCellRuntime({
    world: sim.world,
    entityEntries: interactionState.entityLayer?.entries,
    tx,
    ty,
    avatarEntityId: AVATAR_ENTITY_ID
  });
  const result = legacyAttackVerbRuntime(target.actor, target.x, target.y, target.z);
  const sfxId = legacyVerbSfxIdRuntime(result.playSfx);
  if (sfxId !== null) {
    playSfx(sfxId);
  }
  applyDiagKind(result);
  return result.ok;
}

function tryCastAtCell(sim: AppSimState, tx: number, ty: number): boolean {
  const tz = sim.world.map_z | 0;
  const result = legacyCastVerbRuntime(tx, ty, tz);
  const sfxId = legacyVerbSfxIdRuntime(result.playSfx);
  if (sfxId !== null) {
    playSfx(sfxId);
  }
  applyDiagKind(result);
  return result.ok;
}

function tryDropAtCell(sim: AppSimState, tx: number, ty: number): boolean {
  if (isNetAuthenticated()) {
    const validation = legacyDropVerbValidationRuntime({
      inventory: inventoryCountMapForDropValidationRuntime(sim.inventory, sim.inventoryObjects),
      world: sim.world
    }, tx, ty);
    if (!validation.ok) {
      applyDiagKind(validation);
      return false;
    }
    void netDropInventoryObject(sim, tx, ty).catch((err: unknown) => {
      const failure = legacyDropAsyncFailurePresentationRuntime(errorMessageRuntime(err));
      applyDiagKind(failure);
    });
    return true;
  }
  const result = legacyDropVerbRuntime(sim, tx, ty);
  applyDiagKind(result);
  return result.ok;
}

function tryMoveVerbAtCell(sim: AppSimState, tx: number, ty: number): boolean {
  const tz = sim.world.map_z | 0;
  const result = legacyMoveVerbRuntime(tx, ty, tz);
  applyDiagKind(result);
  return result.ok;
}

function findObjectByAnchor(anchor: InventoryObjectRuntime | null | undefined): U6ObjectEntryRuntime | null {
  const interactionState = state as GameplayInteractionStateView;
  if (!interactionState.objectLayer) {
    return null;
  }
  return resolveObjectByInventoryAnchorRuntime({
    anchor,
    objectsAt: (x, y, z) => interactionState.objectLayer?.objectsAt(x, y, z) ?? [],
    isBedObject: isBedObjectRuntime,
    isChairObject: isChairObjectRuntime
  });
}

function objectFootprintTiles(sim: AppSimState, o: ObjectFootprintSourceRuntime, ox: number, oy: number) {
  const tileId = resolveDoorTileIdRuntime(sim, {
    baseTile: o.baseTile,
    frame: o.frame,
    order: Number(o.order) | 0,
    type: o.type,
    x: o.x,
    y: o.y,
    z: Number(o.z) | 0
  }) & 0xffff;
  return objectFootprintTilesRuntime(ox, oy, tileId, tileFlagsForTile);
}

function isBlockedAt(sim: AppSimState, wx: number, wy: number, wz: number): boolean {
  const interactionState = state as GameplayInteractionStateView;
  const mapCtx = interactionState.mapCtx;
  if (!mapCtx) {
    return false;
  }
  return isBlockedAtRuntime<U6ObjectEntryRuntime>(wx, wy, wz, {
    avatarEntityId: AVATAR_ENTITY_ID,
    entities: interactionState.entityLayer?.entries ?? null,
    isDoorObject: isCloseableDoorObjectRuntime,
    isDoorOpen: (o) => isDoorFrameOpenRuntime(
      o?.type,
      resolvedDoorFrameRuntime(sim, o as Parameters<typeof resolvedDoorFrameRuntime>[1])
    ),
    isImplicitSolidObjectTile: (objType, tileId) => isImplicitSolidObjectTileRuntime(objType, tileId, tileFlagsForTile),
    isSolidEnvObject: isSolidEnvObjectRuntime,
    mapTileAt: (x, y, z) => mapCtx.tileAt(x, y, z),
    objectFootprintTiles: (o, ox, oy) => objectFootprintTiles(sim, o, ox, oy),
    objectsAt: interactionState.objectLayer && interactionState.tileFlags
      ? (x, y, z) => interactionState.objectLayer?.objectsAt(x, y, z) ?? []
      : null,
    terrainFlagsForTile: (tileId) => interactionState.terrainType ? (interactionState.terrainType[tileId & 0x07ff] ?? 0) : 0,
    tileFlagsForTile
  });
}

function tryToggleDoorInFacingDirection(sim: AppSimState, dx: number, dy: number): boolean {
  const interactionState = state as GameplayInteractionStateView;
  if (!interactionState.objectLayer) {
    return false;
  }
  const cell = facingDoorCellRuntime({ world: sim.world, facingDx: dx, facingDy: dy });
  const result = toggleDoorAtCellRuntime({
    sim,
    objectsAt: (x, y, z) => interactionState.objectLayer?.objectsAt(x, y, z) ?? [],
    x: cell.x,
    y: cell.y,
    z: cell.z
  });
  if (result.toggled) {
    applyDiagKind(result);
    return true;
  }
  return false;
}

function clearPendingAvatarMoveCommands(sim: AppSimState | null | undefined): void {
  const interactionState = state as GameplayInteractionStateView;
  if (!Array.isArray(interactionState.queue) || !sim) {
    return;
  }
  interactionState.queue = filterFutureCommandsOfTypeRuntime(interactionState.queue, sim.tick, LEGACY_COMMAND_TYPE.MOVE_AVATAR);
}

function chairFrameForCell(obj: FurniturePoseObjectRuntime | null | undefined, tx: number, ty: number) {
  return chairFrameForCellRuntime(
    obj,
    tx,
    ty,
    (o) => objectFootprintTiles(state.sim, o, o.x | 0, o.y | 0)
  );
}

function objectIsChairAtCell(obj: FurniturePoseObjectRuntime | null | undefined, tx: number, ty: number): boolean {
  return objectIsChairAtCellRuntime(
    obj,
    tx,
    ty,
    tileFlagsForTile,
    (o) => objectFootprintTiles(state.sim, o, o.x | 0, o.y | 0)
  );
}

function objectIsBedAtCell(obj: FurniturePoseObjectRuntime | null | undefined, tx: number, ty: number): boolean {
  return objectIsBedAtCellRuntime(obj, tx, ty, tileFlagsForTile);
}

function furnitureAtWorldCell(sim: AppSimState, tx: number, ty: number, tz: number) {
  const interactionState = state as GameplayInteractionStateView;
  return furnitureAtWorldCellRuntime({
    bedInteractionScore,
    fromX: sim.world.map_x,
    fromY: sim.world.map_y,
    isBedAtCell: objectIsBedAtCell,
    isChairAtCell: objectIsChairAtCell,
    objectsAt: interactionState.objectLayer ? (x, y, z) => interactionState.objectLayer?.objectsAt(x, y, z) ?? [] : null,
    tx,
    ty,
    tz
  });
}

function furnitureAtCell(sim: AppSimState, tx: number, ty: number) {
  return furnitureAtWorldCell(sim, tx, ty, sim.world.map_z | 0);
}

function tryInteractFurnitureObject(sim: AppSimState, o: FurniturePoseObjectRuntime | null | undefined): boolean {
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
  applyDiagKind(result);
  return true;
}

function tryInteractFurnitureInFacingDirection(sim: AppSimState, dx: number, dy: number): boolean {
  const tx = (sim.world.map_x + dx) | 0;
  const ty = (sim.world.map_y + dy) | 0;
  return tryInteractFurnitureObject(sim, furnitureAtCell(sim, tx, ty));
}

function tryToggleDoorAtCell(sim: AppSimState, tx: number, ty: number, tz: number): boolean {
  const interactionState = state as GameplayInteractionStateView;
  if (!interactionState.objectLayer) {
    return false;
  }
  const result = toggleDoorAtCellRuntime({
    sim,
    objectsAt: (x, y, z) => interactionState.objectLayer?.objectsAt(x, y, z) ?? [],
    x: tx,
    y: ty,
    z: tz
  });
  if (result.toggled) {
    applyDiagKind(result);
    return true;
  }
  return false;
}

function tryInteractAtCell(sim: AppSimState, tx: number, ty: number): boolean {
  const interactionState = state as GameplayInteractionStateView;
  const tz = sim.world.map_z | 0;
  if (interactionState.objectLayer) {
    const overlays = interactionState.objectLayer.objectsAt(tx | 0, ty | 0, tz | 0);
    const sfxId = specialUseSfxAtCellRuntime(overlays);
    if (sfxId !== null) {
      playSfx(sfxId);
    }
  }
  if (tryToggleDoorAtCell(sim, tx, ty, tz)) {
    return true;
  }
  return tryInteractFurnitureObject(sim, furnitureAtCell(sim, tx, ty));
}

function tryInteractFacing(sim: AppSimState, dx: number, dy: number): boolean {
  const tx = (sim.world.map_x + dx) | 0;
  const ty = (sim.world.map_y + dy) | 0;
  if (tryInteractAtCell(sim, tx, ty)) {
    return true;
  }
  return false;
}

function initCapturePresets(): void {
  populateCapturePresetSelectRuntime({ document, select: locationSelect, presets: CAPTURE_PRESETS_RUNTIME });
}

function activeCapturePreset(): CapturePresetRuntime | undefined {
  return activeCapturePresetFromSelectRuntime(CAPTURE_PRESETS_RUNTIME, locationSelect);
}

function setStartupMenuIndex(nextIndex: number): void {
  applyStartupMenuIndexRuntime(state, nextIndex, STARTUP_MENU.length);
}

function isNetAuthenticated(): boolean {
  return !!(state.net && state.net.token && state.net.userId);
}

function isSkipIntroEnabled(): boolean {
  return !!skipIntroCheckbox.checked;
}

function setSkipIntroEnabled(enabled: boolean): void {
  writeSkipIntroPreferenceRuntime({
    checkbox: skipIntroCheckbox,
    enabled,
    key: SKIP_INTRO_KEY,
    storage: localStorage
  });
}

function initSkipIntroPreference(): void {
  bindSkipIntroPreferenceRuntime({
    checkbox: skipIntroCheckbox,
    key: SKIP_INTRO_KEY,
    onMaybeStart: maybeStartSessionFromSkipIntro,
    setEnabled: setSkipIntroEnabled,
    storage: localStorage
  });
}

function maybeStartSessionFromSkipIntro(): void {
  if (!shouldStartSessionFromSkipIntroRuntime({
    isAuthenticated: isNetAuthenticated(),
    runtimeReady: state.runtimeReady,
    sessionStarted: state.sessionStarted,
    skipIntroEnabled: isSkipIntroEnabled()
  })) {
    return;
  }
  if (state.bootIntro?.active) {
    abortBootIntroRuntime(state.bootIntro);
  }
  startSessionFromTitle();
}

function activateStartupMenuSelection(): void {
  const action = startupMenuSelectionActionRuntime(STARTUP_MENU, state.startupMenuIndex, isNetAuthenticated());
  const presentation = startupMenuSelectionPresentationRuntime(action);
  if (presentation.kind === "message") {
    if (presentation.netStatus) {
      setNetStatus(presentation.netStatus, presentation.diagText);
    }
    applyDiag(presentation);
    return;
  }
  if (presentation.kind === "start_session") {
    startSessionFromTitle();
  }
}

function placeCameraAtPresetId(presetId: string): void {
  const patch = cameraPresetPatchRuntime(capturePresetByIdRuntime(CAPTURE_PRESETS_RUNTIME, presetId));
  if (!patch) {
    return;
  }
  state.queue = patch.queue;
  state.sim.world.map_x = patch.map_x;
  state.sim.world.map_y = patch.map_y;
  state.sim.world.map_z = patch.map_z;
  if (locationSelect) {
    locationSelect.value = patch.selectValue;
  }
}

function startSessionFromTitle(): void {
  if (state.sessionStarted) {
    return;
  }
  if (!isNetAuthenticated()) {
    const diag = startupSessionGuardDiagRuntime("login_required");
    setNetStatus(diag.netStatus || "idle", diag.diagText);
    applyDiag(diag);
    return;
  }
  if (!state.runtimeReady) {
    applyDiag(startupSessionGuardDiagRuntime("runtime_loading"));
    return;
  }
  if (!state.net.resumeFromSnapshot) {
    placeCameraAtPresetId("avatar_start");
  }
  const patch = startSessionPatchRuntime({
    loopHealth: state.loopHealth,
    nowMs: performance.now()
  });
  state.accMs = patch.accMs;
  state.lastTs = patch.lastTs;
  state.loopHealth = patch.loopHealth;
  state.queue = patch.queue;
  state.sessionStarted = patch.sessionStarted;
  if (state.audio) {
    state.audio.stopMusic();
    state.musicPhase = patch.musicPhase;
    state.musicSong = patch.musicSong;
  }
  endLegacyConversation();
  state.legacyLedgerLines = patch.legacyLedgerLines;
  pushLedgerMessage(`${String(state.net.characterName || "Avatar")}:`);
  showLegacyLedgerPrompt();
  const resumed = !!state.net.resumeFromSnapshot;
  state.net.resumeFromSnapshot = patch.resumeFromSnapshot;
  applyDiag(journeyOnwardStartedDiagRuntime(resumed));
  void netSyncInventoryProjection().catch((err) => {
    const failure = inventorySyncFailureDiagRuntime(errorMessageRuntime(err));
    applyDiag(failure);
  });
}

(window as VmDebugWindow).__vmStartSessionFromTitle = startSessionFromTitle;

function returnToTitleMenu(opts: { saveRemote?: boolean } = {}) {
  if (!state.sessionStarted) {
    return;
  }
  const saveRemote = opts.saveRemote !== false;
  if (saveRemote && isNetAuthenticated()) {
    netSaveSnapshot().catch((err) => {
      const failure = returnToTitleSaveFailureRuntime(errorMessageRuntime(err));
      setNetStatus(failure.statusLevel, failure.statusText);
      applyDiag(failure);
    });
  }
  const patch = returnToTitlePatchRuntime();
  state.queue = patch.queue;
  state.useCursorActive = patch.useCursorActive;
  state.targetVerb = patch.targetVerb;
  endLegacyConversation();
  state.legacyLedgerLines = patch.legacyLedgerLines;
  state.legacyLedgerPrompt = patch.legacyLedgerPrompt;
  state.sessionStarted = patch.sessionStarted;
  state.net.resumeFromSnapshot = patch.resumeFromSnapshot;
  setStartupMenuIndex(patch.startupMenuIndex);
  startStartupMenuMusic();
  applyDiag(patch);
}

function cycleCursor(delta: number): void {
  const cycle = cursorCycleRuntime({
    count: state.cursorPixmaps?.length || 0,
    currentIndex: state.cursorIndex,
    delta
  });
  if (!cycle) {
    return;
  }
  state.cursorIndex = cycle.index;
  applyDiag(cycle);
}

function jumpToPreset(): void {
  const patch = cameraPresetPatchRuntime(activeCapturePreset());
  if (!patch) {
    return;
  }
  state.queue = patch.queue;
  state.sim.world.map_x = patch.map_x;
  state.sim.world.map_y = patch.map_y;
  state.sim.world.map_z = patch.map_z;
  applyDiag(patch);
}

function captureViewportPng(): void {
  const plan = captureFilePlanRuntime({
    kind: "viewport",
    presets: CAPTURE_PRESETS_RUNTIME,
    select: locationSelect,
    world: state.sim.world
  });
  const composed = composeViewportCaptureCanvasRuntime({
    canvas,
    document,
    rows: captureViewportStatusRowsFromElementsRuntime({
      clock: statClock,
      dataSource: statSource,
      date: statDate,
      diagnostic: diagBox,
      entityOverlay: statEntities,
      mapPosition: statPos,
      objectOverlay: statObjects,
      renderParity: statRenderParity,
      stateHash: statHash,
      tile: statTile
    })
  });
  downloadCanvasPngRuntime({ canvas: composed, document, filename: plan.filename });
  applyDiag(captureSuccessDiagRuntime(plan.filename));
}

function captureWorldHudPng(): void {
  drawTileGrid();
  composeLegacyViewportFromModernGrid();
  renderLegacyHudStubOnBackdrop();
  drawInGameServerStatusOverlay();

  const plan = captureFilePlanRuntime({
    kind: "worldhud",
    presets: CAPTURE_PRESETS_RUNTIME,
    select: locationSelect,
    world: state.sim.world
  });
  const out = composeWorldHudCaptureCanvasRuntime({
    document,
    fallbackCanvas: canvas,
    legacyBackdropCanvas,
    legacyMapRect: LEGACY_UI_MAP_RECT,
    legacyViewportCanvas
  });

  downloadCanvasPngRuntime({ canvas: out, document, filename: plan.filename });
  applyDiag(captureSuccessDiagRuntime(plan.filename));
}

async function captureParitySnapshotJson(): Promise<void> {
  if (!state.sessionStarted || !state.mapCtx) {
    applyDiag(paritySnapshotUnavailableDiagRuntime());
    return;
  }
  const radius = clampParityRadiusRuntime(parityRadiusInput ? parityRadiusInput.value : 12);
  const cx = state.sim.world.map_x | 0;
  const cy = state.sim.world.map_y | 0;
  const cz = state.sim.world.map_z | 0;
  const { startX, startY, viewW, viewH } = paritySnapshotWindowRuntime({
    centerX: cx,
    centerY: cy,
    radius
  });
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
    resolveFootprintTile: resolveFootprintObjectTile,
    hasWallTerrain,
    injectLegacyOverlays: null,
    isBackgroundObjectTile: (tileId) => isTileBackground(tileId)
  });
  const cells = buildParitySnapshotCellsRuntime({
    startX,
    startY,
    viewW,
    viewH,
    z: cz,
    viewCtx,
    overlayCells: overlayBuild.overlayCells,
    tileFlags: state.tileFlags,
    terrainType: state.terrainType,
    tileAt: (x, y, z) => state.mapCtx?.tileAt(x, y, z) ?? 0,
    animatedTileAt: (rawTile) => resolveAnimatedTile(rawTile),
    objectsAt: state.objectLayer ? (x, y, z) => state.objectLayer?.objectsAt(x, y, z) ?? [] : null,
    resolveObjectTile: (obj) => resolveDoorTileIdRuntime(state.sim, obj)
  });
  const payload = buildParitySnapshotRuntime({
    capturedAt: new Date().toISOString(),
    tick: state.sim.tick >>> 0,
    centerX: cx,
    centerY: cy,
    centerZ: cz,
    radius,
    overlayCount: overlayBuild.overlayCount,
    hiddenSuppressedCount: overlayBuild.parity?.hiddenSuppressedCount,
    spillOutOfBoundsCount: overlayBuild.parity?.spillOutOfBoundsCount,
    unsortedSourceCount: overlayBuild.parity?.unsortedSourceCount,
    cells
  });
  const copied = await copyTextToClipboardRuntime(JSON.stringify(payload, null, 2), { document, navigator, errorTarget: diagBox });
  const result = paritySnapshotCopyResultRuntime({ copied, x: cx, y: cy, z: cz, radius });
  setCopyStatusRuntime(topCopyStatus, result.copyStatusOk, result.copyStatusDetail);
  applyDiag(result);
}

function applyCommand(sim: AppSimState, cmd: SimCommandRuntime): void {
  const plan = simCommandActionRuntime({
    command: cmd,
    movementMode: state.movementMode,
    avatarX: sim.world.map_x,
    avatarY: sim.world.map_y
  });
  applySimCommandActionPlanRuntime({
    facingState: state,
    handlers: {
      attackAtCell: tryAttackAtCell,
      castAtCell: tryCastAtCell,
      dropAtCell: tryDropAtCell,
      getAtCell: tryGetAtCell,
      lookAtCell: tryLookAtCell,
      moveAtCell: tryMoveVerbAtCell,
      moveAvatar: (_sim, dx, dy) => {
        const moveResult = applyAvatarMoveCommandRuntime(_sim, dx, dy, {
          isBlockedAt: (x, y, z) => isBlockedAt(_sim, x, y, z),
          movementMode: state.movementMode
        });
        if (moveResult.kind === "pose-set-this-tick") {
          return false;
        }
        const patch = avatarMoveAnimationPatchRuntime({
          result: moveResult,
          simTick: _sim.tick,
          nowMs: performance.now(),
          walkAnimWindowMs: AVATAR_WALK_ANIM_WINDOW_MS
        });
        if (patch.avatarLastMoveTick != null) {
          state.avatarLastMoveTick = patch.avatarLastMoveTick;
        }
        if (patch.avatarWalkAnimUntilMs != null) {
          state.avatarWalkAnimUntilMs = patch.avatarWalkAnimUntilMs;
        }
        if (moveResult.kind === "avatar-move") {
          /*
            Canonical-facing behavior: actor pose follows occupied furniture cell.
            NPCs auto-sit from cell occupancy; mirror that for avatar on passable stools/chairs.
          */
          const landedFurniture = furnitureAtCell(_sim, moveResult.targetX, moveResult.targetY);
          if (landedFurniture && isChairObjectRuntime(landedFurniture)) {
            tryInteractFurnitureObject(_sim, landedFurniture);
          }
        } else if (moveResult.kind === "blocked") {
          // QoL: walking into a chair/bed acts like interaction and triggers sit/sleep.
          if (!tryInteractFurnitureObject(_sim, furnitureAtCell(_sim, moveResult.targetX, moveResult.targetY))) {
            playSfx(U6_SFX.BLOCKED);
          }
        }
        return true;
      },
      talkAtCell: tryTalkAtCell,
      useAtCell: tryInteractAtCell,
      useFacing: tryInteractFacing
    },
    plan,
    sim
  });
}

function stepSimTick(sim: AppSimState, queue: readonly SimCommandRuntime[]): SimCommandRuntime[] {
  return advanceSimTickRuntime({
    applyCommand,
    options: {
      daysPerMonth: DAYS_PER_MONTH,
      hoursPerDay: HOURS_PER_DAY,
      isNetAuthenticated,
      minutesPerHour: MINUTES_PER_HOUR,
      monthsPerYear: MONTHS_PER_YEAR,
      ticksPerMinute: TICKS_PER_MINUTE,
      worldPropResetTicks: WORLD_PROP_RESET_TICKS
    },
    queue,
    sim
  }).pending;
}

function primeAudioFromUserGesture(): void {
  if (!state.audio || !state.sim?.world?.sound_enabled) {
    return;
  }
  state.audio.primeFromUserGesture().catch((err) => {
    console.warn("audio prime failed", err);
  });
}

function playSfx(sfxId: number, options: Parameters<U6AudioRuntime["playSfx"]>[1] = {}): boolean {
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

function playAmbientSfx(sfxId: number, options: Parameters<U6AudioRuntime["playAmbientSfx"]>[1] = {}): boolean {
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

function setAudioEnabledFromWorldFlag(): void {
  if (!state.audio) {
    return;
  }
  const plan = audioWorldFlagPlanRuntime({
    bootIntroActive: state.bootIntro?.active,
    sessionStarted: state.sessionStarted,
    soundEnabled: state.sim.world.sound_enabled
  });
  state.audio.setEnabled(plan.enabled);
  if (plan.clearMusicPhase) {
    state.musicPhase = "";
    state.musicSong = "";
  } else if (plan.startBootIntroMusic) {
    syncBootIntroMusicPhase();
  } else if (plan.startStartupMenuMusic) {
    startStartupMenuMusic();
  }
  updateAudioMuteUi();
}

function updateAudioMuteUi(): void {
  renderAudioMuteButtonRuntime(audioMuteButton, state.audio?.status?.().muted);
}

function toggleAudioMute(reason = ""): void {
  if (!state.audio) {
    return;
  }
  const plan = audioMuteTogglePlanRuntime({ muted: state.audio.status().muted, reason });
  state.audio.setMuted(plan.nextMuted);
  updateAudioMuteUi();
  if (plan.shouldPrime) {
    primeAudioFromUserGesture();
  }
  applyDiag(plan);
}

function playCanonicalMusicPhase(phase: unknown, songId: unknown): boolean {
  try {
    if (!state.audio) {
      return false;
    }
    const plan = canonicalMusicPhasePlanRuntime({
      currentPhase: state.musicPhase,
      currentSong: state.musicSong,
      phase,
      songId,
      soundEnabled: state.sim?.world?.sound_enabled
    });
    if (!plan) {
      return false;
    }
    if (plan.alreadyPlaying) {
      return true;
    }
    state.audio.setBackendMode("adlib");
    state.audio.setMusicEnabled(true);
    const ok = state.audio.playMusic(plan.songId);
    if (ok) {
      state.musicPhase = plan.phase;
      state.musicSong = plan.songId;
    }
    return ok;
  } catch (err) {
    console.warn("music phase failed", err);
    return false;
  }
}

function startBootIntroMusic(): boolean {
  return playCanonicalMusicPhase("boot_origin", "bootup.m");
}

function syncBootIntroMusicPhase(): void {
  const scene = currentBootIntroSceneRuntime(state.bootIntro);
  const phase = bootIntroMusicPhaseRuntime(scene);
  if (!phase) {
    return;
  }
  playCanonicalMusicPhase(phase.phase, phase.songId);
}

function startStartupMenuMusic(): boolean {
  const phase = startupMenuMusicPhaseRuntime();
  return playCanonicalMusicPhase(phase.phase, phase.songId);
}

function bootIntroMusicAwaitingGesture(): boolean {
  try {
    return bootIntroMusicAwaitingGestureRuntime({
      bootIntroActive: state.bootIntro?.active,
      musicAwaitingGesture: state.audio?.status?.().musicAwaitingGesture
    });
  } catch (_err) {
    return false;
  }
}

function updateVisibleAmbientSfx(): void {
  if (!state.sessionStarted || !state.objectLayer || !state.sim?.world?.sound_enabled) {
    return;
  }
  const tick = state.sim.tick >>> 0;
  const tickPhase = tick & 0xf;
  const w = state.sim.world;
  const startX = (w.map_x | 0) - (VIEW_W >> 1);
  const startY = (w.map_y | 0) - (VIEW_H >> 1);
  const visible = state.objectLayer.objectsInWindowLegacyOrder(startX, startY, VIEW_W, VIEW_H, w.map_z | 0);
  const candidates = buildAmbientSfxCandidatesRuntime({
    avatarX: w.map_x,
    avatarY: w.map_y,
    objects: visible
  });
  const plan = nextAmbientSfxPlaybackPlanRuntime({
    candidates,
    lastTickBySfx: state.audioAmbientLastTickBySfx,
    tick
  });
  if (!plan) {
    return;
  }
  if (playAmbientSfx(plan.candidate.sfxId, {
    volume: plan.volume,
    distance: plan.distance,
    tickPhase: plan.tickPhase,
    seed: plan.seed
  })) {
    state.audioAmbientLastTickBySfx[String(plan.candidate.sfxId)] = plan.tick;
    state.audioAmbientLastSfx = plan.label;
    state.audioAmbientTriggerCount = (Number(state.audioAmbientTriggerCount) + 1) >>> 0;
  }
}

function queueMove(dx: number, dy: number): void {
  if (state.legacyConversationActive) {
    return;
  }
  if (blockGameplayForBrokenServer()) {
    return;
  }
  clearTransientReconnectMessageOnCommand();
  queueAvatarMoveCommandRuntime({
    state,
    dx,
    dy,
    nowMs: performance.now(),
    minIntervalMs: MOVE_INPUT_MIN_INTERVAL_MS,
    walkAnimWindowMs: AVATAR_WALK_ANIM_WINDOW_MS,
    commandLogMax: COMMAND_LOG_MAX
  });
}

function queueInteractDoor(): void {
  if (state.movementMode !== "avatar") {
    return;
  }
  if (blockGameplayForBrokenServer()) {
    return;
  }
  clearTransientReconnectMessageOnCommand();
  queueFacingUseCommandRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    tick: state.sim.tick,
    facingDx: state.avatarFacingDx,
    facingDy: state.avatarFacingDy,
    commandLogMax: COMMAND_LOG_MAX
  });
}

function queueInteractAtCell(wx: number, wy: number): void {
  if (state.movementMode !== "avatar") {
    return;
  }
  if (blockGameplayForBrokenServer()) {
    return;
  }
  clearTransientReconnectMessageOnCommand();
  const tx = wx | 0;
  const ty = wy | 0;
  queueCellCommandRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    tick: state.sim.tick,
    commandType: LEGACY_COMMAND_TYPE.USE_AT_CELL,
    wx: tx,
    wy: ty,
    commandLogMax: COMMAND_LOG_MAX
  });
}

function queueLegacyTargetVerb(verb: unknown, wx: number, wy: number): void {
  if (state.movementMode !== "avatar") {
    return;
  }
  if (blockGameplayForBrokenServer()) {
    return;
  }
  clearTransientReconnectMessageOnCommand();
  const tx = wx | 0;
  const ty = wy | 0;
  queueLegacyTargetVerbCommandRuntime({
    queue: state.queue,
    commandLog: state.commandLog,
    tick: state.sim.tick,
    verb,
    wx: tx,
    wy: ty,
    commandLogMax: COMMAND_LOG_MAX
  });
}

function fallbackTileColor(t: number): ReturnType<typeof fallbackTileColorRuntime> {
  return fallbackTileColorRuntime(t);
}

function tilePaletteIndex(tileId: number): number {
  return tilePaletteIndexRuntime(tileId, state.terrainType);
}

function terrainOf(tileId: number): number {
  if (!state.terrainType || tileId < 0 || tileId >= state.terrainType.length) {
    return 0;
  }
  return state.terrainType[tileId];
}

type EntityPoseRuntime = "eat" | "play" | "sit" | "sleep" | "stand" | "walk";

function hasWallTerrain(tileId: number): boolean {
  return (terrainOf(tileId) & 0x04) !== 0;
}

function isTileBackground(tileId: number): boolean {
  if (!state.tileFlags2) {
    return false;
  }
  return (state.tileFlags2[tileId & 0x07ff] & 0x20) !== 0;
}

function buildLegacyViewContext(startX: number, startY: number, wz: number): LegacyViewContextRuntime | null {
  const mapCtx = state.mapCtx;
  const objectLayer = state.objectLayer;
  if (!mapCtx) {
    return null;
  }
  return buildLegacyViewContextRuntime({
    dateD: state.sim.world.date_d,
    dateM: state.sim.world.date_m,
    hasWallTerrain,
    isBackgroundObjectTile: isTileBackground,
    mapTileAt: (wx, wy, z) => mapCtx.tileAt(wx, wy, z),
    objectsAt: objectLayer ? (wx, wy, z) => objectLayer.objectsAt(wx, wy, z) : null,
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

function applyLegacyCornerVariant(
  tileId: number,
  wx: number,
  wy: number,
  wz: number,
  viewCtx: LegacyViewContextRuntime | null
): number {
  const mapCtx = state.mapCtx;
  if (!mapCtx) {
    return tileId & 0xffff;
  }
  return applyLegacyCornerVariantRuntime(tileId, wx, wy, wz, {
    mapTileAt: (tx, ty, tz) => mapCtx.tileAt(tx, ty, tz),
    terrainOf,
    viewCtx
  });
}

function shouldBlackoutTile(
  rawTile: number,
  wx: number,
  wy: number,
  viewCtx: LegacyViewContextRuntime | null
): boolean {
  return shouldBlackoutTileRuntime(rawTile, wx, wy, {
    terrainOf,
    viewCtx
  });
}

function stableCornerVariant(
  rawTile: number,
  wx: number,
  wy: number,
  wz: number,
  viewCtx: LegacyViewContextRuntime | null
): number {
  const mapCtx = state.mapCtx;
  if (!mapCtx) {
    return rawTile & 0xffff;
  }
  return stableCornerVariantRuntime(rawTile, wx, wy, wz, {
    mapTileAt: (tx, ty, tz) => mapCtx.tileAt(tx, ty, tz),
    terrainOf,
    viewCtx
  });
}

function buildBaseTileBuffersCurrent(
  startX: number,
  startY: number,
  wz: number,
  viewCtx: LegacyViewContextRuntime | null
): ReturnType<typeof buildBaseTileBuffersRuntime> {
  const mapCtx = state.mapCtx;
  const objectLayer = state.objectLayer;
  return buildBaseTileBuffersRuntime({
    isBackgroundObjectTile: isTileBackground,
    mapTileAt: mapCtx ? (wx, wy, z) => mapCtx.tileAt(wx, wy, z) : null,
    objectsAt: objectLayer ? (wx, wy, z) => objectLayer.objectsAt(wx, wy, z) : null,
    objectsInWindowLegacyOrder: objectLayer && typeof objectLayer.objectsInWindowLegacyOrder === "function"
      ? (wx, wy, w, h, z) => objectLayer.objectsInWindowLegacyOrder(wx, wy, w, h, z)
      : null,
    processBackgroundObjects: Boolean(objectLayer && state.tileFlags2),
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

function buildBaseTileBuffers(
  startX: number,
  startY: number,
  wz: number,
  viewCtx: LegacyViewContextRuntime | null
): BaseTileBuffers {
  const base: BaseTileBuffers = {
    ...buildBaseTileBuffersCurrent(startX, startY, wz, viewCtx),
    debug: null
  };
  base.debug = null;
  return base;
}

function avatarFacingFrameOffset(): number {
  return directionGroupFromDxDyRuntime(state.avatarFacingDx, state.avatarFacingDy);
}

function legacyActorDirectionGroup(entity: U6EntityEntryRuntime): number {
  return legacyActorDirectionGroupRuntime(entity);
}

function legacyActorStandingTileId(entity: U6EntityEntryRuntime, dirGroup: number, moving: boolean): number {
  return legacyActorStandingTileIdRuntime(entity, dirGroup, moving, state.sim.tick >>> 0);
}

function sleepFrameOffsetForBed(bedObj: FurniturePoseObjectRuntime | null | undefined): number {
  if (!bedObj) {
    return 0;
  }
  return sleepFrameOffsetForBedAtCell(bedObj, bedObj.x | 0, bedObj.y | 0);
}

function tileFlagsForTile(tileId: number): number {
  if (!state.tileFlags) {
    return 0;
  }
  return state.tileFlags[tileId & 0x07ff] ?? 0;
}

function furnitureOccupancyCells(obj: FurniturePoseObjectRuntime | null | undefined): ReturnType<typeof furnitureOccupancyCellsRuntime> {
  return furnitureOccupancyCellsRuntime(obj, tileFlagsForTile);
}

function sleepBedCellFrameOffset(bedObj: FurniturePoseObjectRuntime, wx: number, wy: number): number {
  return sleepBedCellFrameOffsetRuntime(bedObj, wx, wy, tileFlagsForTile);
}

function preferredSleepCellForBed(
  bedObj: FurniturePoseObjectRuntime,
  fromX: number,
  fromY: number
): ReturnType<typeof preferredSleepCellForBedRuntime> {
  return preferredSleepCellForBedRuntime(bedObj, fromX, fromY, tileFlagsForTile);
}

function sleepFrameOffsetForBedAtCell(
  bedObj: FurniturePoseObjectRuntime | null | undefined,
  wx: number,
  wy: number
): number {
  /* Legacy AI_SLEEP path in seg_1E0F checks `(GetFrame(bed) - D_0658)`:
     only normalized 0 and 6 are valid sleep orientations, with 6 using frame 1. */
  return sleepFrameOffsetForBedAtCellRuntime(bedObj, wx, wy, tileFlagsForTile);
}

function bedInteractionScore(
  bedObj: FurniturePoseObjectRuntime,
  fromX: number,
  fromY: number
): ReturnType<typeof bedInteractionScoreRuntime> {
  return bedInteractionScoreRuntime(bedObj, fromX, fromY, tileFlagsForTile);
}

function sleepBaseTileForEntity(entity: U6EntityEntryRuntime): number {
  if (!state.entityLayer || !state.entityLayer.baseTiles) {
    return entity.baseTile | 0;
  }
  const legacySleepBase = state.entityLayer.baseTiles[LEGACY_SLEEP_SHAPE_TYPE] ?? 0;
  return legacySleepBase > 0 ? (legacySleepBase | 0) : (entity.baseTile | 0);
}

function avatarRenderTileId(): number | null {
  if (!state.entityLayer || !state.entityLayer.entries) {
    return null;
  }
  const avatar = state.entityLayer.entries.find((e) => e.id === AVATAR_ENTITY_ID) ?? null;
  if (!avatar || !avatar.baseTile) {
    return null;
  }
  if (state.sim.avatarPose === "sleep") {
    const sleepBase = sleepBaseTileForEntity(avatar);
    let bed: FurniturePoseObjectRuntime | null = findObjectByAnchor(state.sim.avatarPoseAnchor);
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
  const walkMoving = avatarWalkPresentationActiveRuntime({
    queuedMoveCount: countQueuedAvatarMoveCommandsRuntime(state.queue),
    nowMs: performance.now(),
    walkAnimUntilMs: state.avatarWalkAnimUntilMs
  });
  const dirGroup = avatarFacingFrameOffset();
  if (state.sim.avatarPose === "sit") {
    let chair: FurniturePoseObjectRuntime | null = findObjectByAnchor(state.sim.avatarPoseAnchor);
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

function entityPoseAt(entity: U6EntityEntryRuntime): EntityPoseRuntime {
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

function entityChairAt(entity: U6EntityEntryRuntime): FurniturePoseObjectRuntime | null {
  return furnitureAtWorldCell(state.sim, entity.x | 0, entity.y | 0, entity.z | 0);
}

function entityBedAt(entity: U6EntityEntryRuntime): FurniturePoseObjectRuntime | null {
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

function entityRenderTileId(e: U6EntityEntryRuntime): number {
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
    const walking = authoritativeActorWalkingRuntime(e, performance.now());
    return legacyActorStandingTileId(e, dirGroup, walking);
  }
  if ((e.type | 0) >= ENTITY_TYPE_ACTOR_MIN && (e.type | 0) <= ENTITY_TYPE_ACTOR_MAX) {
    return legacyActorStandingTileId(e, legacyActorDirectionGroup(e), false);
  }
  return resolveAnimatedObjectTile(e);
}

function avatarBaseTileId(): number | null {
  if (!state.entityLayer || !state.entityLayer.entries) {
    return null;
  }
  const avatar = state.entityLayer.entries.find((e) => e.id === AVATAR_ENTITY_ID) ?? null;
  if (!avatar || !avatar.baseTile) {
    return null;
  }
  return avatar.baseTile & 0xffff;
}

function remotePlayerTileId(player: RemotePresencePlayer): number | null {
  const base = avatarBaseTileId();
  if (base == null) {
    return null;
  }
  const frame = remotePlayerFrameOffsetRuntime(Number(player.facing_dx) | 0, Number(player.facing_dy) | 0);
  return (base + frame) & 0xffff;
}

function tileColor(t: number, palette: RgbPaletteRuntime | null | undefined): string {
  if (!palette) {
    const [r, g, b] = fallbackTileColor(t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const idx = tilePaletteIndex(t);
  const c = palette[idx] ?? [0, 0, 0];
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function paletteForTile(tileId: number): RgbPaletteRuntime {
  if (!state.basePalette) {
    return FALLBACK_RENDER_PALETTE;
  }
  if (!state.enablePaletteFx || !state.tileSet || !state.tileSet.tileUsesLegacyPaletteFx(tileId)) {
    return state.basePalette;
  }
  return getRenderPalette() ?? state.basePalette;
}

function paletteKeyForTile(tileId: number): string {
  if (!state.enablePaletteFx || !state.tileSet || !state.tileSet.tileUsesLegacyPaletteFx(tileId)) {
    return "pal-static";
  }
  return getRenderPaletteKey();
}

function renderCharacterStubPanel(): void {
  if (!charStubCanvas) {
    return;
  }
  const g = charStubCanvas.getContext("2d");
  if (!g) {
    return;
  }
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, charStubCanvas.width, charStubCanvas.height);

  const dataReady = !!(state.tileSet && state.entityLayer && Array.isArray(state.entityLayer.entries));
  let picks = null;
  if (dataReady && state.entityLayer) {
    const avatarTile = avatarRenderTileId();
    const px = state.sim.world.map_x | 0;
    const py = state.sim.world.map_y | 0;
    const pz = state.sim.world.map_z | 0;
    const tick = animationTick();
    picks = projectCharacterPanelPicksRuntime({
      avatarEntityId: AVATAR_ENTITY_ID,
      avatarTileId: avatarTile,
      entities: state.entityLayer.entries,
      playerX: px,
      playerY: py,
      playerZ: pz,
      resolveAnimatedTile: (entity: CharacterPanelEntityRuntime & { tileId: number }) => resolveAnimatedObjectTileAtTick(entity, tick),
      slotCount: CHARACTER_PANEL_SLOTS_RUNTIME.length
    });
  }
  const plan = buildCharacterPanelRenderPlanRuntime({
    canvasH: charStubCanvas.height,
    canvasW: charStubCanvas.width,
    dataReady,
    picks
  });
  g.fillStyle = plan.background.fillStyle;
  g.fillRect(plan.background.x, plan.background.y, plan.background.w, plan.background.h);
  for (const rect of plan.slotRects) {
    g.fillStyle = rect.fillStyle;
    g.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  for (const stroke of plan.slotStrokes) {
    g.strokeStyle = stroke.strokeStyle;
    g.strokeRect(stroke.x, stroke.y, stroke.w, stroke.h);
  }
  if (plan.message) {
    g.fillStyle = plan.message.color;
    g.font = plan.message.font;
    g.fillText(plan.message.text, plan.message.x, plan.message.y);
    return;
  }
  for (const text of plan.texts) {
    g.fillStyle = text.color;
    g.font = text.font;
    g.fillText(text.text, text.x, text.y);
  }
  for (const sprite of plan.sprites) {
    const pal = paletteForTile(sprite.tileId);
    const key = paletteKeyForTile(sprite.tileId);
    const tc = state.tileSet?.tileCanvas(sprite.tileId, pal, key);
    if (!tc) {
      continue;
    }
    g.drawImage(
      tc,
      sprite.sourceX,
      sprite.sourceY,
      sprite.sourceW,
      sprite.sourceH,
      sprite.destX,
      sprite.destY,
      sprite.destW,
      sprite.destH
    );
  }
}

function parseProbeTileHex(v: unknown): number | null {
  const s = String(v || "").trim().toLowerCase();
  const m = /^0x([0-9a-f]+)$/.exec(s);
  if (!m) {
    return null;
  }
  return parseInt(m[1], 16) & 0xffff;
}

function uiProbeHitTest(logicalX: number, logicalY: number): LegacyHudPanelHitRuntime | null {
  return legacyInventoryPaperdollHitTestFromProbeRuntime({
    canonicalUi: getUiProbeForRender().canonical_ui,
    logicalX,
    logicalY,
    statusDisplay: state.legacyStatusDisplay,
    talkStatusDisplay: LEGACY_STATUS_DISPLAY.CMD_9E
  });
}

function buildOverlayCells(
  startX: number,
  startY: number,
  wz: number,
  viewCtx: LegacyViewContextRuntime | null
): ReturnType<typeof buildOverlayCellsModel<U6ObjectEntryRuntime>> {
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
    resolveFootprintTile: resolveFootprintObjectTile,
    hasWallTerrain,
    // Canonical-only path: no client-side synthetic overlay injection.
    injectLegacyOverlays: null,
    isBackgroundObjectTile: (tileId) => isTileBackground(tileId)
  });
}

function topInteractiveOverlayAt(
  overlayCells: RenderOverlayGrid | null,
  startX: number,
  startY: number,
  wx: number,
  wy: number
): RenderOverlayCell | null {
  return topInteractiveOverlayAtModel(overlayCells, VIEW_W, VIEW_H, startX, startY, wx, wy);
}

function measureActorOcclusionParity(
  overlayCells: RenderOverlayGrid | null,
  startX: number,
  startY: number,
  viewCtx: LegacyViewContextRuntime | null,
  entities: readonly U6EntityEntryRuntime[] | null | undefined
): ReturnType<typeof measureActorOcclusionParityModel> {
  return measureActorOcclusionParityModel(overlayCells, VIEW_W, VIEW_H, startX, startY, viewCtx, entities);
}

function drawDropThrowEffects(startX: number, startY: number, z: number): void {
  if (!state.tileSet || state.dropThrowEffects.length === 0) {
    return;
  }
  const plan = dropThrowRenderPlanRuntime({
    arcPx: 10,
    effects: state.dropThrowEffects,
    nowMs: performance.now(),
    resolveAnimatedTile,
    startX,
    startY,
    tileSize: TILE_SIZE,
    viewH: VIEW_H,
    viewW: VIEW_W,
    z
  });
  for (const landedObject of plan.landedObjects) {
    applyAuthoritativeWorldObjectsToLayer([landedObject]);
  }
  for (const sprite of plan.sprites) {
    const tile = sprite.tileId;
    const pal = paletteForTile(tile);
    const key = paletteKeyForTile(tile);
    const tc = state.tileSet.tileCanvas(tile, pal, key);
    if (!tc) {
      continue;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = sprite.alpha;
    ctx.drawImage(tc, sprite.px, sprite.py, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  }
  state.dropThrowEffects = plan.remaining;
}

function drawLegacySelectCellMarker(g: CanvasRenderingContext2D, px: number, py: number, size: number): void {
  /* Canonical world-target selector in seg_0A33:
     SelectRange < 0 => TIL_16C (direction), else TIL_16D (select). */
  const verb = String(state.targetVerb || "");
  const plan = legacySelectCellMarkerPlanRuntime({
    px,
    py,
    selectorTileId: legacyVerbWorldCursorTileRuntime(verb),
    size
  });
  if (state.tileSet && plan.tile) {
    const pal = paletteForTile(plan.tile.tileId);
    const key = paletteKeyForTile(plan.tile.tileId);
    const marker = state.tileSet.tileCanvas(plan.tile.tileId, pal, key);
    if (marker) {
      g.imageSmoothingEnabled = false;
      g.drawImage(marker, plan.tile.x, plan.tile.y, plan.tile.w, plan.tile.h);
      return;
    }
  }
  g.strokeStyle = plan.fallbackStroke.strokeStyle;
  g.lineWidth = plan.fallbackStroke.lineWidth;
  g.strokeRect(
    plan.fallbackStroke.x,
    plan.fallbackStroke.y,
    plan.fallbackStroke.w,
    plan.fallbackStroke.h
  );
}

function drawTileGrid(): void {
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
  const cellIndex = (gx: number, gy: number): number => (gy * VIEW_W) + gx;
  const shouldDrawOverlayEntry = (gx: number, gy: number, entry: RenderOverlayCell | null): boolean => {
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
  const drawOverlayEntry = (entry: RenderOverlayCell, px: number, py: number): void => {
    const tileSet = state.tileSet;
    if (!tileSet) {
      return;
    }
    const op = paletteForTile(entry.tileId);
    const ok = paletteKeyForTile(entry.tileId);
    const oc = tileSet.tileCanvas(entry.tileId, op, ok);
    if (!oc) {
      return;
    }
    ctx.drawImage(oc, px, py, TILE_SIZE, TILE_SIZE);
    if (state.showOverlayDebug && entry.dbg) {
      ctx.fillStyle = "rgba(7, 12, 16, 0.72)";
      ctx.fillRect(px + 3, py + 3, 48, 14);
      ctx.fillStyle = "#f5f5f5";
      ctx.font = "10px monospace";
      ctx.fillText(entry.dbg, px + 5, py + 13);
    }
  };
  const drawEntityTile = (tileId: number, gx: number, gy: number): void => {
    if (gx < 0 || gy < 0 || gx >= VIEW_W || gy >= VIEW_H) {
      return;
    }
    const tileSet = state.tileSet;
    if (!tileSet) {
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
    const ec = tileSet.tileCanvas(tileId, ep, ek);
    if (!ec) {
      return;
    }
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
        const basePal = state.basePalette ?? FALLBACK_RENDER_PALETTE;
        const baseKey = "pal-static";
        const baseTileCanvas = state.tileSet.tileCanvas(animRawTile, basePal, baseKey);
        if (!baseTileCanvas) {
          continue;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(baseTileCanvas, px, py, TILE_SIZE, TILE_SIZE);
        const topPal = state.basePalette ?? FALLBACK_RENDER_PALETTE;
        const topKey = "pal-static";
        const tc = state.tileSet.tileCanvas(animTile, topPal, topKey);
        if (!tc) {
          continue;
        }
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
  drawDropThrowEffects(startX, startY, state.sim.world.map_z);
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

function updateStats(): void {
  const w = state.sim.world;
  const audioStatus = state.audio ? state.audio.status() : null;
  const statusText = buildStatusPanelTextRuntime({
    audioAmbientLastSfx: state.audioAmbientLastSfx,
    audioAmbientTriggerCount: state.audioAmbientTriggerCount,
    audioStatus,
    avatarFacingDx: state.avatarFacingDx,
    avatarFacingDy: state.avatarFacingDy,
    avatarPose: state.sim.avatarPose,
    centerAnimatedTile: state.centerAnimatedTile,
    centerPaletteBand: state.centerPaletteBand,
    centerRawTile: state.centerRawTile,
    enablePaletteFx: state.enablePaletteFx,
    entityLayerLoaded: !!state.entityLayer,
    entityLayerTotalLoaded: state.entityLayer?.totalLoaded,
    entityOverlayCount: state.entityOverlayCount,
    hashText: hashHexRuntime(simStateHashRuntime(state.sim, HASH_CFG)),
    interactionProbeTile: state.interactionProbeTile,
    loopHealth: state.loopHealth,
    movementMode: state.movementMode,
    netRemotePlayers: state.net.remotePlayers,
    npcOcclusionBlockedMoves: state.npcOcclusionBlockedMoves,
    objectLayerLoaded: !!state.objectLayer,
    objectLayerTotalLoaded: state.objectLayer?.totalLoaded,
    objectOverlayCount: state.objectOverlayCount,
    palettePhase: renderPaletteTick(),
    queueLength: state.queue.length,
    renderParityMismatches: state.renderParityMismatches,
    sessionStarted: state.sessionStarted,
    simPaused: state.simPaused,
    soundEnabled: state.sim.world.sound_enabled,
    targetVerb: state.targetVerb,
    targetVerbLabels: LEGACY_TARGET_VERB_LABEL,
    tick: state.sim.tick,
    tileId: state.centerRawTile,
    timeOfDayLabel: timeOfDayLabelRuntime(w.time_h),
    useCursorActive: state.useCursorActive,
    world: w
  });
  applyStatusPanelTextRuntime({
    statAudio,
    statAvatarState,
    statCenterBand,
    statCenterTiles,
    statClock,
    statDate,
    statEntities,
    statHash,
    statLoopHealth,
    statNetPlayers,
    statNpcOcclusionBlocks,
    statObjects,
    statPalettePhase,
    statPos,
    statQueued,
    statRenderParity,
    statSimLoop,
    statTick,
    topInputMode,
    topTimeOfDay
  }, statusText, { audioReady: !!state.audio });
  if (statAudio && state.audio) {
    updateAudioMuteUi();
  }
  if (state.debugPanelTab === "chat") {
    renderDebugChatLedgerPanel();
  } else if (debugChatCount) {
    renderDebugChatLedgerCountRuntime({
      ledger: state.debugChatLedger,
      countFormatter: formatLedgerEntryCountRuntime,
      countTarget: debugChatCount
    });
  }
}

function releaseReplayUrl(): void {
  releaseReplayUrlRuntime(state, URL);
}

function setReplayCsv(csvText: string): void {
  setReplayCsvRuntime({
    csvText,
    link: replayDownload,
    state,
    url: URL
  });
}

function runReplayCheckpoints(
  commands: readonly SimCommandRuntime[],
  totalTicks: number,
  interval: number
): ReplayCheckpointRuntime[] {
  return runReplayCheckpointsRuntime({
    commands,
    totalTicks,
    interval,
    createSim: () => createInitialAppSimState(INITIAL_WORLD, INITIAL_SEED),
    stepSim: stepSimTick,
    hashSim: (sim) => hashHexRuntime(simStateHashRuntime(sim, HASH_CFG))
  });
}

function animationViewportHash(sim: AppSimState): string | null {
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

function runAnimationCheckpoints(
  commands: readonly SimCommandRuntime[],
  totalTicks: number,
  interval: number
): ReplayCheckpointRuntime[] {
  if (!state.mapCtx) {
    return [];
  }
  return runReplayCheckpointsRuntime({
    commands,
    totalTicks,
    interval,
    createSim: () => createInitialAppSimState(INITIAL_WORLD, INITIAL_SEED),
    stepSim: stepSimTick,
    hashSim: (sim) => animationViewportHash(sim) ?? ""
  });
}

function verifyReplayStability(): void {
  const totalTicks = replayTotalTicksRuntime({
    currentTick: state.sim.tick,
    commandTicks: replayCommandTicksRuntime(state.commandLog)
  });
  const a = runReplayCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const b = runReplayCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const aa = runAnimationCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);
  const ab = runAnimationCheckpoints(state.commandLog, totalTicks, REPLAY_CHECKPOINT_INTERVAL);

  const result = replayVerificationResultRuntime({
    animationA: aa,
    animationB: ab,
    replayA: a,
    replayB: b,
    totalTicks
  });

  statReplay.textContent = result.statText;
  applyDiagKind(result);

  if (result.csvText !== null) {
    setReplayCsv(result.csvText);
  }
}

function resetRun(): void {
  const patch = resetRunPatchRuntime({
    animationFrozen: state.animationFrozen,
    initialSeed: INITIAL_SEED,
    initialWorld: INITIAL_WORLD
  });
  state.sim = patch.sim;
  state.queue = patch.queue;
  state.commandLog = patch.commandLog;
  state.paletteFrameTick = patch.paletteFrameTick;
  state.paletteFrame = patch.paletteFrame;
  state.centerRawTile = patch.centerRawTile;
  state.centerAnimatedTile = patch.centerAnimatedTile;
  state.centerPaletteBand = patch.centerPaletteBand;
  state.renderParityMismatches = patch.renderParityMismatches;
  state.interactionProbeTile = patch.interactionProbeTile;
  state.useCursorActive = patch.useCursorActive;
  state.targetVerb = patch.targetVerb;
  endLegacyConversation();
  state.legacyLedgerLines = patch.legacyLedgerLines;
  state.legacyLedgerPrompt = patch.legacyLedgerPrompt;
  state.avatarLastMoveTick = patch.avatarLastMoveTick;
  state.avatarWalkAnimUntilMs = patch.avatarWalkAnimUntilMs;
  resetMoveInputThrottleRuntime(state);
  state.npcOcclusionBlockedMoves = patch.npcOcclusionBlockedMoves;
  if (patch.frozenAnimationTick !== null) {
    state.frozenAnimationTick = patch.frozenAnimationTick;
  }
  statReplay.textContent = "not run";
  releaseReplayUrl();
  applyReplayDownloadDisabledRuntime(replayDownload);
}

function tickLoop(ts: number): void {
  try {
    const timingPatch = loopFrameTimingPatchRuntime({
      accMs: state.accMs,
      lastTs: state.lastTs,
      loopHealth: state.loopHealth,
      maxAccMs: LOOP_MAX_ACC_MS,
      timestampMs: ts
    });
    const dtMs = timingPatch.loopHealth.lastDtMs;
    state.accMs = timingPatch.accMs;
    state.lastTs = timingPatch.lastTs;
    state.loopHealth = timingPatch.loopHealth;
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
          viewCtx ? (x: number, y: number) => viewCtx.visibleAtWorld(x, y) : null
        );
        state.npcOcclusionBlockedMoves += blocked;
      }
      const nowMs = performance.now();
      if (shouldProbeReconnectRuntime({
        isAuthenticated: isNetAuthenticated(),
        isServerConnectionBroken: isServerConnectionBroken(),
        sessionStarted: state.sessionStarted,
        reconnectProbeInFlight: state.reconnectProbeInFlight,
        nowMs,
        reconnectProbeLastMs: state.reconnectProbeLastMs,
        reconnectProbeIntervalMs: NET_RECONNECT_PROBE_INTERVAL_MS
      })) {
        state.reconnectProbeLastMs = nowMs;
        netProbeReconnect().catch((_err) => {});
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
      if (shouldAutosaveSnapshotRuntime({
        currentTick: state.sim.tick,
        intervalTicks: NET_AUTOSAVE_TICKS,
        isAuthenticated: isNetAuthenticated(),
        isInFlight: state.net.snapshotSaveInFlight,
        isSessionStarted: state.sessionStarted,
        lastSavedTick: state.net.lastSavedTick,
        syncPaused: state.net.backgroundSyncPaused
      })) {
        void netAutosaveSnapshot().catch((err) => {
          recordBackgroundNetFailure(err, "Snapshot autosave");
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
          const failure = criticalMaintenanceFailureRuntime(err, errorMessageRuntime);
          recordBackgroundNetFailure(err, "Maintenance");
          applyDiag(failure);
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
      drawInGameServerStatusOverlay();
    }
    drawCustomCursorLayer();
    updateStats();
  } catch (err) {
    const recovery = frameLoopRecoveryRuntime({
      errorMessage: errorMessageRuntime(err),
      loopHealth: state.loopHealth,
      nowMs: performance.now()
    });
    state.loopHealth = recovery.loopHealth;
    state.accMs = recovery.accMs;
    state.lastTs = recovery.lastTs;
    applyDiag(recovery);
    console.error("tickLoop error", err);
  }
  requestAnimationFrame(tickLoop);
}

function clearObjectTransientState(): void {
  clearObjectTransientStateRuntime(state.sim);
}

function markAuthoritativeWorldObjectHidden(sourceKey: unknown, dueAtMs: unknown): void {
  markHiddenWorldObjectClientStateRuntime(
    state.net,
    sourceKey,
    dueAtMs,
    Date.now(),
    DEFAULT_PICKUP_RESPAWN_MS_RUNTIME
  );
}

function purgeAuthoritativeHiddenWorldObjectsFromLayer(): void {
  removeHiddenWorldObjectsFromLayerRuntime(state.objectLayer, state.net.hiddenWorldObjectKeys);
}

function applyAuthoritativeHiddenWorldObjectsFromMeta(meta: unknown): void {
  applyHiddenWorldObjectsMetaToClientRuntime({
    fallbackRespawnMs: DEFAULT_PICKUP_RESPAWN_MS_RUNTIME,
    layer: state.objectLayer,
    meta,
    nowMs: Date.now(),
    state: state.net
  });
}

function isAuthoritativeWorldObjectHidden(sourceKey: string): boolean {
  const visibility = hiddenWorldObjectVisibilityForClientRuntime(state.net, sourceKey, Date.now());
  return visibility.hidden;
}

async function fetchPristineBaselineVersion() {
  return fetchObjectBaselineVersionRuntime(PRISTINE_BASELINE_VERSION_PATH);
}

function isObjectRemovedForObjectLayer(obj: U6ObjectEntryRuntime): boolean {
  const removed = state?.sim?.removedObjectKeys;
  if (!removed || typeof removed !== "object") {
    return isAuthoritativeWorldObjectHidden(serverObjectKeyForWorldObjectRuntime(obj));
  }
  return !!removed[objectLayerAnchorKeyRuntime(obj)]
    || isAuthoritativeWorldObjectHidden(serverObjectKeyForWorldObjectRuntime(obj));
}

function applyRuntimeAssetFallbackPatch(): void {
  const patch = runtimeAssetFallbackPatchRuntime();
  state.mapCtx = patch.mapCtx;
  state.tileSet = patch.tileSet;
  state.objectLayer = patch.objectLayer;
  state.entityLayer = patch.entityLayer;
  state.animData = patch.animData;
  state.palette = patch.palette;
  state.basePalette = patch.basePalette;
  state.avatarPortraitCanvas = patch.avatarPortraitCanvas;
  state.portraitArchiveA = patch.portraitArchiveA;
  state.portraitArchiveB = patch.portraitArchiveB;
  state.startupTitlePixmaps = patch.startupTitlePixmaps;
  state.startupMenuPixmap = patch.startupMenuPixmap;
  state.bootIntroBanks = patch.bootIntroBanks;
  state.bootIntroBlocks = patch.bootIntroBlocks;
  state.bootIntroPalettes = patch.bootIntroPalettes;
  state.bootIntroFont = patch.bootIntroFont;
  state.bootIntro.active = patch.bootIntroActive;
  state.cursorPixmaps = patch.cursorPixmaps;
  state.u6MainFont = patch.u6MainFont;
  state.legacyPaperPixmap = patch.legacyPaperPixmap;
  state.lookStringEntries = patch.lookStringEntries;
  state.tileFlags = patch.tileFlags;
  state.tileFlags2 = patch.tileFlags2;
  state.typeWeights = patch.typeWeights;
  state.terrainType = patch.terrainType;
  state.pristineBaselineVersion = patch.pristineBaselineVersion;
  state.pristineBaselineLastPollTick = patch.pristineBaselineLastPollTick;
}

async function loadPristineObjectBaseline(baseTiles: ArrayLike<number>): Promise<ObjectBaselineLoadResultRuntime> {
  return loadPristineObjectBaselineRuntime({
    baseTiles,
    isObjectRemoved: isObjectRemovedForObjectLayer,
    paths: [PRISTINE_OBJECT_PATH, RUNTIME_OBJECT_PATH]
  });
}

async function refreshPristineBaseline(force = false): Promise<boolean> {
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
    purgeAuthoritativeHiddenWorldObjectsFromLayer();
    state.pristineBaselineVersion = version;
    clearObjectTransientState();
    const diag = pristineBaselineReloadedDiagRuntime(version);
    applyDiag(diag);
    return true;
  } catch (err) {
    const diag = pristineBaselineReloadFailedDiagRuntime(errorMessageRuntime(err));
    applyDiag(diag);
    return false;
  } finally {
    state.pristineBaselinePollInFlight = false;
  }
}

async function loadRuntimeAssets() {
  try {
    if (!state.sessionStarted && !state.bootIntro?.played) {
      startBootIntroMusic();
    }
    state.cornerVariantCache.clear();
    const requiredResponses = new Map<string, Response>();
    await Promise.all(REQUIRED_RUNTIME_ASSET_NAMES.map(async (name) => {
      requiredResponses.set(name, await fetch(`../assets/runtime/${name}`));
    }));
    const missing = missingRequiredRuntimeAssetsRuntime(requiredResponses);
    if (missing.length) {
      throw new Error(`missing ${missing.join(", ")}`);
    }

    const [mapRes, chunksRes, palRes, flagRes, idxRes, maskRes, mapTileRes, objTileRes, baseTileRes, animRes, paperRes, fontRes, portraitBRes, portraitARes, titlesRes, mainmenuRes, intro1Res, intro2Res, intro3Res, introPaletteRes, introBlocksRes, introFontRes, cursorRes, lookRes, converseARes, converseBRes] = await Promise.all([
      ...RUNTIME_ASSET_FETCH_MANIFEST.map((asset) => fetch(asset.path))
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
    if (state.bootIntroBanks && state.bootIntroPalettes && !isSkipIntroEnabled() && !state.bootIntro.played && !state.sessionStarted) {
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
    let converseA: Uint8Array | null = converseAPrimary;
    let converseB: Uint8Array | null = converseBPrimary;
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
    const conversationArchiveDiag = conversationArchiveDiagRuntime({
      converseALoaded: state.converseArchiveA instanceof Uint8Array,
      converseAValidated
    });
    if (conversationArchiveDiag) {
      applyDiag(conversationArchiveDiag);
    }
    const tileflagSlices = decodeRuntimeTileflagSlicesRuntime(flagRes.ok, flagBuf);
    state.terrainType = tileflagSlices.terrainType;
    state.tileFlags = tileflagSlices.tileFlags;
    state.typeWeights = tileflagSlices.typeWeights;
    state.tileFlags2 = tileflagSlices.tileFlags2;

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
      const baseTiles = buildBaseTileTableRuntime(new Uint8Array(baseTileBuf));
      const loaded = await loadPristineObjectBaseline(baseTiles);
      state.objectLayer = loaded.objectLayer;
      state.entityLayer = loaded.entityLayer;
      purgeAuthoritativeHiddenWorldObjectsFromLayer();
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

    applyLegacyFrameLayout();
    const assetStatus = runtimeAssetStatusTextRuntime({
      animEntryCount: state.animData?.entries.length,
      entityTotalLoaded: state.entityLayer?.totalLoaded,
      objectFilesLoaded: state.objectLayer?.filesLoaded,
      objectTotalLoaded: state.objectLayer?.totalLoaded,
      paletteLoaded: state.palette,
      tileSetLoaded: state.tileSet
    });
    statSource.textContent = assetStatus.sourceText;
    applyDiag(assetStatus);
  } catch (err) {
    applyRuntimeAssetFallbackPatch();
    state.cornerVariantCache.clear();
    state.portraitCanvasCache.clear();
    state.startupCanvasCache.clear();
    state.bootIntroCanvasCache.clear();
    applyLegacyFrameLayout();
    statSource.textContent = "synthetic fallback";
    applyDiag(runtimeAssetFallbackDiagRuntime(errorMessageRuntime(err)));
  }
}

type HoveredWorldCellRuntime = {
  gx: number;
  gy: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  z: number;
};

function clampUseCursorToView(): void {
  clampTargetCursorToViewRuntime({
    state,
    world: state.sim.world,
    viewW: VIEW_W,
    viewH: VIEW_H
  });
}

function beginTargetCursor(verb: unknown): void {
  if (state.movementMode !== "avatar") {
    return;
  }
  const result = beginTargetCursorRuntime({
    state,
    world: state.sim.world,
    verb,
    viewW: VIEW_W,
    viewH: VIEW_H
  });
  if (!result.ok) {
    return;
  }
  applyDiag(result);
}

function moveUseCursor(dx: number, dy: number): void {
  if (!state.useCursorActive) {
    return;
  }
  const result = moveTargetCursorRuntime({
    state,
    world: state.sim.world,
    dx,
    dy,
    viewW: VIEW_W,
    viewH: VIEW_H
  });
  if (result.shouldCommit) {
    commitUseCursorInteract();
  }
}

function commitUseCursorInteract(): void {
  const commit = commitTargetCursorRuntime(state);
  if (commit.kind === "legacy_verb") {
    queueLegacyTargetVerb(commit.verb, commit.x, commit.y);
    return;
  }
  if (commit.kind === "interact") {
    queueInteractAtCell(commit.x, commit.y);
  }
}

function pickupOverlaySourceFromMouseCell(cell: HoveredWorldCellRuntime): { x: number; y: number } | null {
  if (!state.mapCtx || !state.objectLayer) {
    return null;
  }
  const viewCtx = buildLegacyViewContext(cell.startX, cell.startY, cell.z);
  const overlayBuild = buildOverlayCells(cell.startX, cell.startY, cell.z, viewCtx);
  const list = overlayBuild.overlayCells
    ? (overlayBuild.overlayCells[(cell.gy * VIEW_W) + cell.gx] || [])
    : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const overlay = list[i] as RenderOverlayCell;
    if (Number.isFinite(Number(overlay.sourceX)) && Number.isFinite(Number(overlay.sourceY))) {
      return { x: overlay.sourceX | 0, y: overlay.sourceY | 0 };
    }
  }
  return null;
}

function commitActiveTargetCursorFromMouse(ev: MouseEvent): boolean {
  const cell = hoveredWorldCellFromMouse();
  const source = cell && state.targetVerb === LEGACY_TARGET_VERB_RUNTIME.GET
    ? pickupOverlaySourceFromMouseCell(cell)
    : null;
  const commit = applyTargetCursorMouseCommitRuntime(state, cell, source);
  if (commit.kind === "none") {
    return false;
  }
  commitUseCursorInteract();
  ev.preventDefault();
  return true;
}

function cancelTargetCursor(): void {
  if (!cancelTargetCursorRuntime(state)) {
    return;
  }
  applyDiag(targetCursorCancelledDiagRuntime());
}

function moveDeltaFromKey(ev: KeyboardEvent, allowDiagonal: boolean): MoveDeltaRuntime | null {
  return moveDeltaFromKeyRuntime(ev, allowDiagonal);
}

function beginLegacyVerbTarget(verb: unknown): boolean {
  if (blockGameplayForBrokenServer()) {
    return false;
  }
  clearTransientReconnectMessageOnCommand();
  const item = verb === LEGACY_TARGET_VERB_RUNTIME.DROP
    ? inventoryObjectForDropSelectionRuntime(state.sim.inventoryObjects, state.legacyHudSelection)
    : null;
  const plan = legacyTargetStartPlanRuntime({
    dropStatusDisplay: LEGACY_STATUS_DISPLAY.CMD_92,
    hasDropItem: !!item,
    movementMode: state.movementMode,
    verb
  });
  if (plan.action === "blocked") {
    for (const line of plan.ledgerLines) {
      pushLedgerMessage(line);
    }
    if (plan.ledgerLines.length) {
      showLegacyLedgerPrompt();
    }
    applyDiag(plan);
    return false;
  }
  if (plan.legacyStatusDisplay !== undefined) {
    state.legacyStatusDisplay = plan.legacyStatusDisplay;
  }
  if (verb === LEGACY_TARGET_VERB_RUNTIME.DROP) {
    pushLegacyDropTargetPrompt(item);
  }
  beginTargetCursor(verb);
  return state.useCursorActive;
}

function promptNetLoginLogout(): void {
  if (isNetAuthenticated()) {
    netLogout();
    return;
  }
  if (countSavedProfilesRuntime(NET_PROFILE_STORAGE.storageKey) > 1) {
    refreshNetAccountSelect();
    setAccountModalOpen(true);
    applyNetStatusPresentation(netStatusChooseAccountRuntime());
    return;
  }
  netLogin().then(() => {
    applyDiag(netLoginHotkeyOkDiagRuntime(state.net.username, state.net.characterName));
  }).catch((err) => {
    const reason = errorMessageRuntime(err);
    const diag = netLoginHotkeyFailedDiagRuntime(reason);
    setNetStatus(diag.statusLevel, diag.statusText);
    applyDiag(diag);
  });
}

function saveWorldSnapshotHotkey(): void {
  netSaveSnapshot().then(() => {
    updateNetSessionStat();
    applyDiag(worldSnapshotSavedHotkeyDiagRuntime(state.sim.tick));
  }).catch((err) => {
    const reason = errorMessageRuntime(err);
    const diag = worldSnapshotSaveFailedHotkeyDiagRuntime(reason);
    setNetStatus(diag.statusLevel, diag.statusText);
    applyDiag(diag);
  });
}

function loadWorldSnapshotHotkey(): void {
  netLoadSnapshot().then((out) => {
    updateNetSessionStat();
    applyDiag(worldSnapshotLoadedHotkeyDiagRuntime(snapshotSavedTickRuntime(out)));
  }).catch((err) => {
    const reason = errorMessageRuntime(err);
    const diag = worldSnapshotLoadFailedHotkeyDiagRuntime(reason);
    setNetStatus(diag.statusLevel, diag.statusText);
    applyDiag(diag);
  });
}

function runtimePartyMembersForUiProbe(): number[] {
  const members = normalizePartyMemberIdsRuntime(state.sim.partyMembers, 1);
  state.sim.partyMembers = members.slice();
  state.sim.partySize = members.length >>> 0;
  if ((state.sim.world.active | 0) >= members.length) {
    state.sim.world.active = 0;
  }
  return members;
}

function buildRuntimePayloadForUiProbe(partyMembers: readonly number[]) {
  return buildUiProbeRuntimePayloadRuntime({
    sim: state.sim,
    commandLog: state.commandLog,
    runtimeProfile: state.runtimeProfile,
    runtimeExtensions: state.runtimeExtensions,
    conversation: {
      active: state.legacyConversationActive,
      targetName: state.legacyConversationTargetName,
      targetObjNum: state.legacyConversationTargetObjNum,
      targetObjType: state.legacyConversationTargetObjType,
      portraitTile: state.legacyConversationPortraitTile,
      showInventory: state.legacyConversationShowInventory,
      equipmentSlots: state.legacyConversationEquipmentSlots
    },
    movement: {
      mode: state.movementMode,
      facingDx: state.avatarFacingDx,
      facingDy: state.avatarFacingDy,
      lastMoveTick: state.avatarLastMoveTick,
      queue: state.queue,
      sessionStarted: state.sessionStarted,
      nowMs: performance.now(),
      walkAnimUntilMs: state.avatarWalkAnimUntilMs
    },
    partyMembers,
    partyNameById: state.partyNameById
  });
}

function captureUiProbeHotkey(): void {
  const debugWindow = window as VmDebugWindow;
  const fallbackCapture = (): { digest: string; probe: UiProbeContractRuntime } => {
    const probe = getUiProbeForRender();
    return { probe, digest: uiProbeDigest(probe) };
  };
  const captured = debugWindow.__vmCaptureUiProbe?.() || fallbackCapture();
  const probe = captured.probe;
  const digest = captured.digest;
  const filename = uiProbeFilenameRuntime(state.sim.tick);
  downloadJsonFileRuntime({ data: probe, document, filename, url: URL });
  const presentation = uiProbeCapturePresentationRuntime({ digest, filename });
  if (topCopyStatus) {
    topCopyStatus.textContent = presentation.copyStatusText;
  }
  applyDiag(presentation);
}

function cycleUiProbeMode(): void {
  state.uiProbeMode = nextUiProbeModeRuntime(state.uiProbeMode);
  applyDiag(uiProbeModePresentationRuntime(state.uiProbeMode));
}

function toggleLegacyHudLayer(): void {
  state.legacyHudLayerHidden = !state.legacyHudLayerHidden;
  applyDiag(legacyHudLayerDiagRuntime(state.legacyHudLayerHidden));
}

function getUiProbeForRender(): ReturnType<typeof buildUiProbeContract> {
  const partyMembers = runtimePartyMembersForUiProbe();
  return buildUiProbeContract({
    mode: normalizeUiProbeModeRuntime(state.uiProbeMode),
    runtime: buildRuntimePayloadForUiProbe(partyMembers)
  });
}

installUiProbeDebugHooksRuntime({
  target: window as VmDebugWindow,
  buildProbe: getUiProbeForRender,
  digestProbe: uiProbeDigest
});

function handleLegacyHudClick(ev: MouseEvent, surface: HTMLCanvasElement | null | undefined): boolean {
  const s = surface || canvas;
  const rect = s.getBoundingClientRect();
  const plan = legacyHudClickPlanRuntime({
    clientX: ev.clientX,
    clientY: ev.clientY,
    hitTest: uiProbeHitTest,
    legacyFramePreviewEnabled: document.documentElement.getAttribute("data-legacy-frame-preview") === "on",
    legacyHudLayerHidden: state.legacyHudLayerHidden,
    serverConnectionBroken: isServerConnectionBroken(),
    sessionStarted: state.sessionStarted,
    surfaceBounds: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    surfaceSize: { width: s.width || 0, height: s.height || 0 },
  });
  if (plan.kind === "ignore") {
    return false;
  }
  if (plan.kind === "block_server") {
    blockGameplayForBrokenServer();
    ev.preventDefault();
    return true;
  }
  clearTransientReconnectMessageOnCommand();
  state.legacyHudSelection = plan.hit;
  applyDiag(legacyHudHitDiagRuntime(plan.hit));
  ev.preventDefault();
  return true;
}

function runLegacyNonTargetAction(k: string): boolean {
  const patch = legacyNonTargetCommandPatchRuntime({
    currentInCombat: state.sim.world.in_combat,
    inventoryStatusDisplay: LEGACY_STATUS_DISPLAY.CMD_92,
    key: k,
    partyStatusDisplay: LEGACY_STATUS_DISPLAY.CMD_91
  });
  if (!patch.handled) {
    return false;
  }
  clearTransientReconnectMessageOnCommand();
  if (patch.legacyStatusDisplay !== undefined) {
    state.legacyStatusDisplay = patch.legacyStatusDisplay;
  }
  if (patch.inCombat !== undefined) {
    state.sim.world.in_combat = patch.inCombat;
  }
  applyDiag(patch);
  return true;
}

function runLegacyCommandKey(k: string): boolean {
  if (state.legacyConversationActive) {
    return false;
  }
  const action = legacyKeyboardCommandActionRuntime(k);
  if (action.kind === "target") {
    return beginLegacyVerbTarget(action.verb);
  }
  return runLegacyNonTargetAction(k);
}

function runDebugHotkeys(ev: KeyboardEvent): boolean {
  const action = debugHotkeyActionRuntime(ev);
  return runDebugHotkeyActionRuntime(action, {
    save_snapshot: saveWorldSnapshotHotkey,
    load_snapshot: loadWorldSnapshotHotkey,
    toggle_sound: () => {
      const plan = audioSoundTogglePlanRuntime(state.sim.world.sound_enabled);
      state.sim.world.sound_enabled = plan.nextSoundEnabled;
      setAudioEnabledFromWorldFlag();
      if (plan.shouldPrime) {
        primeAudioFromUserGesture();
      }
      applyDiag(plan);
    },
    toggle_help: () => {
      const diag = toggleHelpPanelRuntime(document.querySelector(".vm-help"));
      if (diag) {
        applyDiag(diag);
      }
    },
    version_string: () => {
      applyDiag(versionStringHotkeyDiagRuntime());
    },
    login_logout: promptNetLoginLogout,
    capture_probe: captureUiProbeHotkey,
    toggle_legacy_hud: toggleLegacyHudLayer,
    cycle_probe_mode: cycleUiProbeMode,
    critical_maintenance: () => {
      netRunCriticalMaintenance({ silent: false }).catch((err) => {
        const failure = criticalMaintenanceFailureRuntime(err, errorMessageRuntime);
        setNetStatus(failure.statusLevel, failure.statusText);
        applyDiag(failure);
      });
    },
    capture_worldhud: captureWorldHudPng,
    capture_viewport: captureViewportPng,
    toggle_overlay: () => setOverlayDebug(!state.showOverlayDebug),
    toggle_animation: () => setAnimationMode(state.animationFrozen ? "live" : "freeze"),
    toggle_palette_fx: () => setPaletteFxMode(!state.enablePaletteFx),
    toggle_movement: () => setMovementMode(state.movementMode === "avatar" ? "ghost" : "avatar"),
    jump_preset: jumpToPreset,
    reset_run: resetRun,
    verify_replay: verifyReplayStability,
    cursor_prev: () => cycleCursor(-1),
    cursor_next: () => cycleCursor(1),
    legacy_scale_prev: () => cycleLegacyScaleMode(-1),
    legacy_scale_next: () => cycleLegacyScaleMode(1)
  });
}

function handleBootIntroInput(ev: Event, key?: string): boolean {
  if (!state.bootIntro?.active) {
    return false;
  }
  const plan = bootIntroInputPlanRuntime({
    active: state.bootIntro.active,
    awaitingGesture: bootIntroMusicAwaitingGesture(),
    key
  });
  if (plan.preventDefault) {
    ev.preventDefault();
  }
  if (plan.action === "abort") {
    abortBootIntroRuntime(state.bootIntro);
    ev.preventDefault();
    return true;
  }
  if (plan.action === "advance" && advanceBootIntroInputRuntime(state.bootIntro)) {
    if (state.bootIntro.active) {
      syncBootIntroMusicPhase();
    } else {
      startStartupMenuMusic();
    }
    ev.preventDefault();
    return true;
  }
  return true;
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
  if (shouldLetBrowserHandleShortcutRuntime(ev)) {
    // Let browser/system shortcuts work (copy/paste/select-all/find/etc).
    return;
  }
  if (!state.sessionStarted) {
    if (handleBootIntroInput(ev, k)) {
      return;
    }
    const startupPatch = startupMenuKeyPatchRuntime({
      currentIndex: state.startupMenuIndex,
      key: k,
      menuCount: STARTUP_MENU.length
    });
    if (!startupPatch.handled) {
      return;
    }
    if (startupPatch.nextIndex !== null) {
      setStartupMenuIndex(startupPatch.nextIndex);
    }
    if (startupPatch.activateSelection) {
      activateStartupMenuSelection();
    }
    ev.preventDefault();
    return;
  }

  const delta = moveDeltaFromKey(ev, false);
  const activePlan = activeGameKeydownPlanRuntime({
    code: ev.code,
    hoverReportCopy: isHoverReportCopyKeyRuntime(ev),
    key: k,
    legacyConversationActive: state.legacyConversationActive,
    moveDelta: delta,
    useCursorActive: state.useCursorActive
  });
  if (activePlan.action === "return_to_title") {
    returnToTitleMenu();
    ev.preventDefault();
    return;
  }
  if (activePlan.action === "hover_report_copy") {
    setCopyPendingStatusRuntime(topCopyStatus);
    void copyHoverReportToClipboard();
    ev.preventDefault();
    return;
  }
  if (activePlan.action === "legacy_conversation") {
    if (isServerConnectionBroken()) {
      if (runDebugHotkeys(ev)) {
        ev.preventDefault();
        return;
      }
      blockGameplayForBrokenServer();
      ev.preventDefault();
      return;
    }
    clearTransientReconnectMessageOnCommand();
    if (handleLegacyConversationKeydown(ev)) {
      ev.preventDefault();
      return;
    }
    if (runDebugHotkeys(ev)) {
      ev.preventDefault();
    }
    return;
  }

  if (isServerConnectionBroken()) {
    if (runDebugHotkeys(ev)) {
      ev.preventDefault();
      return;
    }
    blockGameplayForBrokenServer();
    ev.preventDefault();
    return;
  }

  if (activePlan.action === "target_cursor") {
    const cursorAction = activeTargetCursorKeyActionRuntime(ev, moveDeltaFromKeyRuntime);
    if (cursorAction.kind === "move") {
      moveUseCursor(cursorAction.dx, cursorAction.dy);
      ev.preventDefault();
      return;
    }
    if (cursorAction.kind === "commit") {
      commitUseCursorInteract();
      ev.preventDefault();
      return;
    }
    if (cursorAction.kind === "cancel") {
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

  if (activePlan.action === "move") {
    queueMove(activePlan.dx, activePlan.dy);
    ev.preventDefault();
    return;
  }

  if (activePlan.action === "pass_turn") {
    clearTransientReconnectMessageOnCommand();
    applyDiag(activePlan.diag);
    ev.preventDefault();
    return;
  }
  if (activePlan.action === "party_digit") {
    clearTransientReconnectMessageOnCommand();
    const partyMembers = runtimePartyMembersForUiProbe();
    const resolution = resolvePartySwitchDigitRuntime({
      digitKey: activePlan.digitKey,
      partyMembers,
      activeIndex: state.sim.world.active
    });
    if (resolution.changed) {
      state.sim.world.active = resolution.next_active_index | 0;
    }
    const diag = partySwitchDigitDiagRuntime(activePlan.digitKey, resolution);
    applyDiag(diag);
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

function startupMenuIndexAtEvent(ev: MouseEvent, surface: HTMLCanvasElement | null | undefined): number {
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

function hoveredWorldCellFromMouse(): HoveredWorldCellRuntime | null {
  return hoveredWorldCellRuntime({
    sessionStarted: state.sessionStarted,
    mouseInCanvas: state.mouseInCanvas,
    mapReady: !!state.mapCtx,
    mouseNormX: state.mouseNormX,
    mouseNormY: state.mouseNormY,
    worldX: state.sim.world.map_x,
    worldY: state.sim.world.map_y,
    worldZ: state.sim.world.map_z,
    viewW: VIEW_W,
    viewH: VIEW_H,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    legacyFramePreview: isLegacyFramePreviewOn() && !!legacyBackdropCanvas,
    legacyMapRect: LEGACY_UI_MAP_RECT,
    legacySurfaceWidth: legacyBackdropCanvas?.width,
    legacySurfaceHeight: legacyBackdropCanvas?.height
  });
}

function hex(value: unknown, width = 0): string {
  return hexRuntime(value, width);
}

function buildHoverReportText(): string | null {
  const hoverCell = hoveredWorldCellFromMouse();
  const cell = hoverCell ?? hoveredOrFallbackWorldCellRuntime({
    sessionStarted: state.sessionStarted,
    mapReady: !!state.mapCtx,
    viewW: VIEW_W,
    viewH: VIEW_H,
    worldX: state.sim.world.map_x,
    worldY: state.sim.world.map_y,
    worldZ: state.sim.world.map_z
  });
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
  const objects = state.objectLayer ? state.objectLayer.objectsAt(wx, wy, wz) : [];
  return buildHoverReportTextRuntime({
    wx,
    wy,
    wz,
    rawTile,
    animTile,
    tileFlag,
    terrain,
    visible,
    open,
    overlays: list,
    objects: objects.map((o) => {
      const tileId = resolveDoorTileIdRuntime(state.sim, o) & 0xffff;
      const tileFlags = state.tileFlags ? (state.tileFlags[tileId & 0x07ff] ?? 0) : 0;
      return {
        ...o,
        tileFlags,
        tileId
      };
    })
  });
}

async function copyHoverReportToClipboard(options: { enrich?: boolean } = {}): Promise<void> {
  const enrich = options.enrich !== false;
  const report = buildHoverReportText();
  if (!report) {
    const result = hoverReportUnavailableResultRuntime();
    applyHoverReportCopyResultRuntime(result, diagBox);
    setCopyStatusRuntime(topCopyStatus, result.copyStatusOk, result.copyStatusDetail);
    return;
  }
  let enrichedReport = report;
  if (enrich) {
    try {
      const cell = hoveredWorldCellFromMouse();
      if (cell && isNetAuthenticated()) {
        const out = await netFetchWorldObjectsAtCell(cell.x | 0, cell.y | 0, cell.z | 0);
        if (out && Array.isArray(out.objects)) {
          enrichedReport = `${report}\n${serverWorldObjectsHoverTextRuntime(out.objects)}`;
        }
      }
    } catch (_err) {
      // Keep base local hover report available if net authority fetch fails.
    }
  }
  const ok = await copyTextToClipboardRuntime(enrichedReport, { document, navigator, errorTarget: diagBox });
  const result = hoverReportCopyResultRuntime({
    ok,
    report: enrichedReport,
    reason: diagBox?.dataset?.copyError || ""
  });
  applyHoverReportCopyResultRuntime(result, diagBox);
  setCopyStatusRuntime(topCopyStatus, result.copyStatusOk, result.copyStatusDetail);
}

function handleShiftContextMenu(ev: MouseEvent, surface: HTMLCanvasElement | null | undefined): void {
  if (!shouldSuppressShiftContextMenuRuntime(ev)) {
    return;
  }
  ev.preventDefault();
}

function handleShiftRightMouseDownCopy(ev: MouseEvent, surface: HTMLCanvasElement | null | undefined): void {
  if (!isShiftRightClickCopyGestureRuntime(ev)) {
    return;
  }
  ev.preventDefault();
  ev.stopPropagation();
  updateCanvasMouseFromEvent(ev, surface);
  setCopyPendingStatusRuntime(topCopyStatus);
  const report = buildHoverReportText();
  if (!report) {
    const result = hoverReportUnavailableResultRuntime();
    applyHoverReportCopyResultRuntime(result, diagBox);
    setCopyStatusRuntime(topCopyStatus, result.copyStatusOk, result.copyStatusDetail);
    return;
  }
  const sync = copyTextToClipboardSyncRuntime(report, { document, errorTarget: diagBox });
  const result = hoverReportCopyResultRuntime({
    ok: sync.ok,
    report,
    reason: sync.reason || "copy blocked"
  });
  applyHoverReportCopyResultRuntime(result, diagBox);
  setCopyStatusRuntime(topCopyStatus, result.copyStatusOk, result.copyStatusDetail);
}

function activeCursorSurface(): HTMLCanvasElement {
  const surface = activeCursorSurfaceRuntime({
    hasLegacyBackdrop: !!legacyBackdropCanvas,
    legacyFramePreviewEnabled: isLegacyFramePreviewOn()
  });
  return surface === "legacy_backdrop" && legacyBackdropCanvas ? legacyBackdropCanvas : canvas;
}

function updateCanvasMouseFromEvent(ev: MouseEvent, surface: HTMLCanvasElement | null | undefined): void {
  const s = activeCursorSurface() || surface || canvas;
  applyCanvasMouseEventRuntime({ event: ev, state, surface: s });
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
  if (handleBootIntroInput(ev)) {
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
  clearCanvasMouseStateRuntime(state);
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
      if (commitActiveTargetCursorFromMouse(ev)) {
        return;
      }
      if (handleLegacyHudClick(ev, legacyBackdropCanvas)) {
        return;
      }
      return;
    }
    if (handleBootIntroInput(ev)) {
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
    clearCanvasMouseStateRuntime(state);
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

  legacyViewportCanvas.addEventListener("click", (ev) => {
    primeAudioFromUserGesture();
    updateCanvasMouseFromEvent(ev, legacyViewportCanvas);
    if (state.sessionStarted && commitActiveTargetCursorFromMouse(ev)) {
      return;
    }
  });

  legacyViewportCanvas.addEventListener("mouseleave", () => {
    clearCanvasMouseStateRuntime(state);
  });
}

bindBrowserLifecycleRuntime({
  window,
  document,
  onResize: applyLegacyFrameLayout,
  onVisibilityChange: () => {
    const patch = loopVisibilityResetPatchRuntime({
      loopHealth: state.loopHealth,
      nowMs: performance.now()
    });
    state.loopHealth = patch.loopHealth;
    state.lastTs = patch.lastTs;
    state.accMs = patch.accMs;
  }
});

initSkipIntroPreference();

loadRuntimeAssets().finally(() => {
  state.runtimeReady = true;
  applyDiag(startupAssetsReadyDiagRuntime({
    hasMapContext: state.mapCtx,
    profile: state.runtimeProfile,
    runtimeExtensions: runtimeExtensionsSummary(state.runtimeExtensions)
  }));
  maybeStartSessionFromSkipIntro();
  requestAnimationFrame((ts) => {
    state.lastTs = ts;
    requestAnimationFrame(tickLoop);
  });
});

initRuntimeProfileConfig();
initTheme();
initFont();
initPreferenceControlsRuntime({
  storage: localStorage,
  booleans: [
    { key: GRID_KEY, fallback: "off", select: gridToggle, onApply: setGrid },
    { key: DEBUG_OVERLAY_KEY, fallback: "off", select: debugOverlayToggle, onApply: setOverlayDebug },
    { key: PALETTE_FX_KEY, fallback: "on", select: paletteFxToggle, onApply: setPaletteFxMode },
    { key: LEGACY_FRAME_PREVIEW_KEY, fallback: "on", select: capturePreviewToggle, onApply: setLegacyFramePreview }
  ],
  choices: [
    { key: ANIMATION_KEY, fallback: "live", allowed: ["live", "freeze"], select: animationToggle, onApply: setAnimationMode },
    { key: MOVEMENT_MODE_KEY, fallback: "avatar", allowed: ["avatar", "ghost"], select: movementModeToggle, onApply: setMovementMode },
    { key: LEGACY_SCALE_MODE_KEY, fallback: "4", allowed: LEGACY_SCALE_MODES, aliases: { native: "4" }, select: legacyScaleModeToggle, onApply: setLegacyScaleMode }
  ]
});
initCapturePresets();
initNetPanel();
initPanelCopyButtons();
setStartupMenuIndex(0);
bindCaptureControlButtonsRuntime({
  jumpButton,
  captureViewportButton: captureButton,
  captureWorldHudButton,
  paritySnapshotButton,
  onJump: jumpToPreset,
  onCaptureViewport: captureViewportPng,
  onCaptureWorldHud: captureWorldHudPng,
  onParitySnapshot: captureParitySnapshotJson
});
bindDebugPanelButtonsRuntime({
  runtimeTab: debugTabRuntime,
  chatTab: debugTabChat,
  copyChatButton: debugChatCopyButton,
  clearChatButton: debugChatClearButton,
  onSelectTab: setDebugPanelTab,
  onCopyChat: async () => {
    const ok = await copyTextToClipboardRuntime(buildDebugChatLedgerTextImported(state.debugChatLedger), { document, navigator, errorTarget: diagBox });
    applyDiag(debugChatLedgerCopyDiagRuntime(ok));
  },
  onClearChat: () => {
    clearDebugChatLedgerRuntime(state.debugChatLedger);
    renderDebugChatLedgerPanel();
    applyDiag(debugChatLedgerClearDiagRuntime());
  }
});
setDebugPanelTab("runtime");
