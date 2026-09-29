package com.rnnewarchsample

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults
import com.rnnewarchsample.sdk.SdkPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // App-local New Architecture modules (not autolinked).
          add(SdkPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    disableInteropLayers()
  }

  /**
   * New Architecture only: RN's stable defaults minus both interop layers, so a module that
   * is not a real TurboModule (or a view that is not a Fabric component) fails instead of
   * silently falling back. Must run before the ReactHost is created.
   */
  private fun disableInteropLayers() {
    ReactNativeFeatureFlags.dangerouslyForceOverride(
        object : ReactNativeNewArchitectureFeatureFlagsDefaults() {
          override fun useTurboModuleInterop(): Boolean = false

          override fun useFabricInterop(): Boolean = false
        })
  }
}
