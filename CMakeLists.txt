cmake_minimum_required(VERSION 3.20)

project(ultima6_modern C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

enable_testing()

add_subdirectory(modern/sim-core)

add_executable(opl_register_render
  modern/tools/opl_register_render.cpp
  legacy/scummvm/engines/ultima/nuvie/sound/adplug/fm_opl.cpp
)
target_include_directories(opl_register_render PRIVATE modern/tools/scummvm_standalone legacy/scummvm legacy/scummvm/engines)
target_compile_definitions(opl_register_render PRIVATE HAVE_CONFIG_H)

find_program(BASH_PROGRAM bash)
if(BASH_PROGRAM)
  add_test(
    NAME tools_compare_checkpoints_test
    COMMAND ${BASH_PROGRAM} ${CMAKE_SOURCE_DIR}/modern/tools/test_compare_checkpoints.sh
  )
  add_test(
    NAME tools_legacy_ui_anchors_test
    COMMAND ${BASH_PROGRAM} ${CMAKE_SOURCE_DIR}/modern/tools/test_legacy_ui_anchors.sh
  )
endif()

find_program(NODE_PROGRAM node)
if(BASH_PROGRAM AND NODE_PROGRAM)
  add_test(
    NAME client_web_render_composition_test
    COMMAND ${BASH_PROGRAM} ${CMAKE_SOURCE_DIR}/modern/tools/test_client_web_render_composition.sh
  )
  add_test(
    NAME client_web_ui_probe_test
    COMMAND ${BASH_PROGRAM} ${CMAKE_SOURCE_DIR}/modern/tools/test_client_web_ui_probe.sh
  )
  add_test(
    NAME client_web_audio_test
    COMMAND ${BASH_PROGRAM} ${CMAKE_SOURCE_DIR}/modern/tools/test_client_web_audio.sh
  )
  add_test(
    NAME net_server_contract_test
    COMMAND ${BASH_PROGRAM} ${CMAKE_SOURCE_DIR}/modern/tools/test_net_contracts.sh
  )
endif()
