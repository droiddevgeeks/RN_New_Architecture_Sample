# App-level CMake, copied from react-native/ReactAndroid/cmake-utils/default-app-setup
# so we can compile the shared C++ Turbo Module into libappmodules.so.
cmake_minimum_required(VERSION 3.13)

project(appmodules)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

set(SHARED_CPP_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../shared)

target_sources(${CMAKE_PROJECT_NAME} PRIVATE ${SHARED_CPP_DIR}/NativeSdkCrypto.cpp)
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ${SHARED_CPP_DIR})
