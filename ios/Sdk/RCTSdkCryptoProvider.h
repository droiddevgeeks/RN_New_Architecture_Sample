#import <Foundation/Foundation.h>
#import <ReactCommon/RCTTurboModule.h>

NS_ASSUME_NONNULL_BEGIN

/// Hands the shared C++ `NativeSdkCrypto` module to the iOS TurboModule system.
/// Registered via `codegenConfig.ios.modules.NativeSdkCrypto.className`.
@interface RCTSdkCryptoProvider : NSObject <RCTModuleProvider>
@end

NS_ASSUME_NONNULL_END
