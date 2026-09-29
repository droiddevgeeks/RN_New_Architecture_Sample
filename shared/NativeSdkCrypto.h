#pragma once

#include <AppSpecsJSI.h>

#include <memory>
#include <string>

namespace facebook::react {

/**
 * Pure C++ Turbo Native Module. The same source compiles into the iOS app
 * (via Xcode target) and the Android app (via jni/CMakeLists.txt).
 */
class NativeSdkCrypto : public NativeSdkCryptoCxxSpec<NativeSdkCrypto> {
 public:
  explicit NativeSdkCrypto(std::shared_ptr<CallInvoker> jsInvoker);

  std::string sha256(jsi::Runtime& rt, std::string input);
  bool luhnCheck(jsi::Runtime& rt, std::string cardNumber);
};

} // namespace facebook::react
