cmake_minimum_required(VERSION 3.20)

project(ultima6_modern C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

enable_testing()

add_subdirectory(modern/sim-core)

find_program(BASH_PROGRAM bash)
if(BASH_PROGRAM)
  add_test(
    NAME tools_compare_checkpoints_test
    COMMAND ${BASH_PROGRAM} ${CMAKE_SOURCE_DIR}/modern/tools/test_compare_checkpoints.sh
  )
endif()

find_program(NODE_PROGRAM node)
if(BASH_PROGRAM AND NODE_PROGRAM)
  add_test(
    NAME client_web_render_composition_test
    COMMAND ${BASH_PROGRAM} ${CMAKE_SOURCE_DIR}/modern/tools/test_client_web_render_composition.sh
  )
endif()
