add_library(sim_core STATIC
  src/sim_core.c
  src/u6_objlist.c
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
