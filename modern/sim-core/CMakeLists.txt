add_library(sim_core STATIC
  src/sim_core.c
  src/u6_entities.c
  src/u6_objlist.c
  src/u6_map.c
)

target_include_directories(sim_core
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_executable(sim_core_replay_test
  tests/test_replay.c
)

target_link_libraries(sim_core_replay_test PRIVATE sim_core)

add_test(NAME sim_core_replay_test COMMAND sim_core_replay_test)

add_executable(sim_core_world_state_io_test
  tests/test_world_state_io.c
)

target_link_libraries(sim_core_world_state_io_test PRIVATE sim_core)

add_test(NAME sim_core_world_state_io_test COMMAND sim_core_world_state_io_test)

add_executable(sim_core_objlist_compat_test
  tests/test_objlist_compat.c
)

target_link_libraries(sim_core_objlist_compat_test PRIVATE sim_core)

add_test(NAME sim_core_objlist_compat_test COMMAND sim_core_objlist_compat_test)

add_executable(sim_core_u6_map_test
  tests/test_u6_map.c
)

target_link_libraries(sim_core_u6_map_test PRIVATE sim_core)

add_test(NAME sim_core_u6_map_test COMMAND sim_core_u6_map_test)

add_executable(sim_core_clock_rollover_test
  tests/test_clock_rollover.c
)

target_link_libraries(sim_core_clock_rollover_test PRIVATE sim_core)

add_test(NAME sim_core_clock_rollover_test COMMAND sim_core_clock_rollover_test)

add_executable(sim_core_snapshot_persistence_test
  tests/test_snapshot_persistence.c
)

target_link_libraries(sim_core_snapshot_persistence_test PRIVATE sim_core)

add_test(NAME sim_core_snapshot_persistence_test COMMAND sim_core_snapshot_persistence_test)

add_executable(sim_core_command_envelope_test
  tests/test_command_envelope.c
)

target_link_libraries(sim_core_command_envelope_test PRIVATE sim_core)

add_test(NAME sim_core_command_envelope_test COMMAND sim_core_command_envelope_test)

add_executable(sim_core_replay_checkpoints_test
  tests/test_replay_checkpoints.c
)

target_link_libraries(sim_core_replay_checkpoints_test PRIVATE sim_core)

add_test(NAME sim_core_replay_checkpoints_test COMMAND sim_core_replay_checkpoints_test)

add_executable(sim_core_entities_test
  tests/test_entities.c
)

target_link_libraries(sim_core_entities_test PRIVATE sim_core)

add_test(NAME sim_core_entities_test COMMAND sim_core_entities_test)
