#import "RCTSdkCore.h"

#import "SdkSwiftBridge.h"

using namespace facebook::react;

@implementation RCTSdkCore {
  SdkCoreImpl *_impl;
}

+ (NSString *)moduleName
{
  return @"NativeSdkCore";
}

- (instancetype)init
{
  if (self = [super init]) {
    _impl = [SdkCoreImpl new];
    __weak __typeof(self) weakSelf = self;
    _impl.onStatusChange = ^(NSString *status) {
      [weakSelf emitOnStatusChange:@{@"status" : status}];
    };
  }
  return self;
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeSdkCoreSpecJSI>(params);
}

- (ModuleConstants<JS::NativeSdkCore::Constants>)constantsToExport
{
  return [self getConstants];
}

- (ModuleConstants<JS::NativeSdkCore::Constants>)getConstants
{
  return typedConstants<JS::NativeSdkCore::Constants>({
      .sdkName = SdkCoreImpl.sdkName,
      .platform = @"ios",
  });
}

- (NSString *)getSdkVersion
{
  return SdkCoreImpl.sdkVersion;
}

- (void)initialize:(JS::NativeSdkCore::SdkConfig &)config
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  // Copy out of the C++ struct: it only lives for the duration of this call.
  NSString *env = config.env() ?: @"";
  NSString *appId = config.appId() ?: @"";
  [_impl initializeWithEnv:env
                     appId:appId
                completion:^(NSError *_Nullable error) {
                  if (error) {
                    reject(error.userInfo[SdkCoreImpl.errorCodeKey], error.localizedDescription, error);
                  } else {
                    resolve(nil);
                  }
                }];
}

- (void)createSession:(double)amount
             currency:(NSString *)currency
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  [_impl createSessionWithAmount:amount
                        currency:currency
                      completion:^(NSDictionary *_Nullable session, NSError *_Nullable error) {
                        if (error) {
                          reject(error.userInfo[SdkCoreImpl.errorCodeKey], error.localizedDescription, error);
                        } else {
                          resolve(session);
                        }
                      }];
}

@end
