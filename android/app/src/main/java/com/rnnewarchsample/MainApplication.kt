package com.rnnewarchsample

import android.app.Application
import android.util.Log
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
    if (BuildConfig.DISABLE_LEGACY_INTEROP) {
      disableLegacyModuleInterop()
    }
  }

  /**
   * Compatibility experiment: RN's stable channel is exactly
   * [ReactNativeNewArchitectureFeatureFlagsDefaults]; this is the same set with only the
   * legacy-module interop layer switched off. Must run before the ReactHost is created.
   */
  private fun disableLegacyModuleInterop() {
    val alreadyRead =
        ReactNativeFeatureFlags.dangerouslyForceOverride(
            object : ReactNativeNewArchitectureFeatureFlagsDefaults() {
              override fun useTurboModuleInterop(): Boolean = false
            })
    Log.w(
        "LegacyInterop",
        "Legacy module interop DISABLED (flags read before override: ${alreadyRead ?: "none"})",
    )
  }
}
