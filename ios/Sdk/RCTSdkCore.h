#import <AppSpecs/AppSpecs.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// ObjC++ adapter: conforms to the codegen `NativeSdkCoreSpec` protocol and
/// forwards to the Swift `SdkCoreImpl`. Registered via `codegenConfig.ios.modules`.
@interface RCTSdkCore : NativeSdkCoreSpecBase <NativeSdkCoreSpec>
@end

NS_ASSUME_NONNULL_END
