#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${U6M_BUILD_DIR:-$ROOT_DIR/build}"

"$ROOT_DIR/modern/tools/cmake_configure.sh" "$ROOT_DIR" "$BUILD_DIR"
cmake --build "$BUILD_DIR"

required_tests=(
  sim_core_replay_test
  sim_core_world_state_io_test
  sim_core_snapshot_persistence_test
  sim_core_command_envelope_test
  sim_core_replay_checkpoints_test
  tools_compare_checkpoints_test
  client_web_render_composition_test
)

for t in "${required_tests[@]}"; do
  ctest --test-dir "$BUILD_DIR" -R "^${t}$" --output-on-failure
 done

if command -v bun >/dev/null 2>&1; then
  "$ROOT_DIR/modern/tools/test_net_contracts.sh"
  "$ROOT_DIR/modern/tools/test_runtime_contract.sh"
  "$ROOT_DIR/modern/tools/test_typescript_no_explicit_any.sh"
  "$ROOT_DIR/modern/tools/test_legacy_ui_anchors.sh"
  "$ROOT_DIR/modern/tools/test_client_web_anim_data.sh"
  "$ROOT_DIR/modern/tools/test_client_web_entity_layer.sh"
  "$ROOT_DIR/modern/tools/test_client_web_map_runtime.sh"
  "$ROOT_DIR/modern/tools/test_client_web_queue.sh"
  "$ROOT_DIR/modern/tools/test_client_web_legacy_pixmap.sh"
  "$ROOT_DIR/modern/tools/test_client_web_shape_archive.sh"
  "$ROOT_DIR/modern/tools/test_client_web_palette_runtime.sh"
  "$ROOT_DIR/modern/tools/test_client_web_indexed_pixels.sh"
  "$ROOT_DIR/modern/tools/test_client_web_audio.sh"
  "$ROOT_DIR/modern/tools/test_client_web_legacy_text_render.sh"
  "$ROOT_DIR/modern/tools/test_client_web_tile_set.sh"
  "$ROOT_DIR/modern/tools/test_client_web_legacy_actor_frame.sh"
  "$ROOT_DIR/modern/tools/test_client_web_avatar_move.sh"
  "$ROOT_DIR/modern/tools/test_client_web_furniture_pose.sh"
  "$ROOT_DIR/modern/tools/test_client_web_object_footprint.sh"
  "$ROOT_DIR/modern/tools/test_client_web_collision.sh"
  "$ROOT_DIR/modern/tools/test_client_web_conversation.sh"
  "$ROOT_DIR/modern/tools/test_client_web_error_runtime.sh"
  "$ROOT_DIR/modern/tools/test_client_web_app_state.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_probe.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_boot_intro.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_character_panel.sh"
  "$ROOT_DIR/modern/tools/test_client_web_cursor.sh"
  "$ROOT_DIR/modern/tools/test_client_web_legacy_view_tile.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_inventory_paperdoll.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_paperdoll_equipment.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_party_message.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_preference.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_status_text.sh"
  "$ROOT_DIR/modern/tools/test_client_web_legacy_text.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_message_log.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_panel_scope.sh"
  "$ROOT_DIR/modern/tools/test_client_web_net_account.sh"
  "$ROOT_DIR/modern/tools/test_client_web_net_status.sh"
  "$ROOT_DIR/modern/tools/test_client_web_net_world.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_target_resolver.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_mechanics_capability.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_verb_capability.sh"
  "$ROOT_DIR/modern/tools/test_client_web_ui_probe_fixture.sh"
else
  echo "Skipping Bun contract tests: bun not found in PATH"
fi

echo "Required CI tests passed (${#required_tests[@]} ctests + JS contract checks)."
