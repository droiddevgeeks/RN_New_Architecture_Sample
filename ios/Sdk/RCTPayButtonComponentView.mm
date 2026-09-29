#import "RCTPayButtonComponentView.h"

#import <react/renderer/components/AppSpecs/ComponentDescriptors.h>
#import <react/renderer/components/AppSpecs/EventEmitters.h>
#import <react/renderer/components/AppSpecs/Props.h>
#import <react/renderer/components/AppSpecs/RCTComponentViewHelpers.h>

#import "SdkSwiftBridge.h"

using namespace facebook::react;

@interface RCTPayButtonComponentView () <RCTPayButtonViewProtocol>
@end

@implementation RCTPayButtonComponentView {
  PayButtonView *_view;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<PayButtonComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const PayButtonProps>();
    _props = defaultProps;

    _view = [[PayButtonView alloc] initWithFrame:self.bounds];
    __weak __typeof(self) weakSelf = self;
    _view.onPress = ^{
      [weakSelf emitPayPress];
    };
    self.contentView = _view;
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<const PayButtonProps>(props);
  [_view updateWithLabel:[NSString stringWithUTF8String:newProps.label.c_str()]
                  amount:[NSString stringWithUTF8String:newProps.amount.c_str()]
                disabled:newProps.disabled
                 outline:newProps.variant == PayButtonVariant::Outline];
  [super updateProps:props oldProps:oldProps];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTPayButtonHandleCommand(self, commandName, args);
}

#pragma mark - RCTPayButtonViewProtocol

- (void)setLoading:(BOOL)isLoading
{
  [_view setLoading:isLoading];
}

#pragma mark - Events

- (void)emitPayPress
{
  if (!_eventEmitter) {
    return;
  }
  std::static_pointer_cast<const PayButtonEventEmitter>(_eventEmitter)
      ->onPayPress({.timestamp = [[NSDate date] timeIntervalSince1970] * 1000.0});
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [_view setLoading:NO];
}

@end
