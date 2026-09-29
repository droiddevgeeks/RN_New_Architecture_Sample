#pragma once

// The app's generated `-Swift.h` also declares `ReactNativeDelegate` (AppDelegate.swift),
// whose ObjC superclass must be visible before the Swift header is imported.
// Prebuilt React core and build-from-source expose it under different paths.
#if __has_include(<React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>)
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#else
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#endif

#import "RNNewArchSample-Swift.h"
