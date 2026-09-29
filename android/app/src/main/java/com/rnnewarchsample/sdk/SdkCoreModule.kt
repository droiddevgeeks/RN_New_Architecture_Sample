package com.rnnewarchsample.sdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.rnnewarchsample.specs.NativeSdkCoreSpec

/** Turbo Native Module adapter: generated [NativeSdkCoreSpec] -> [SdkCore]. */
class SdkCoreModule(reactContext: ReactApplicationContext) : NativeSdkCoreSpec(reactContext) {

  private val core = SdkCore { status ->
    emitOnStatusChange(Arguments.createMap().apply { putString("status", status) })
  }

  override fun getTypedExportedConstants(): Map<String, Any> =
      mapOf(
          "sdkName" to SdkCore.SDK_NAME,
          "platform" to "android",
      )

  override fun getSdkVersion(): String = SdkCore.SDK_VERSION

  override fun initialize(config: ReadableMap, promise: Promise) {
    val env = if (config.hasKey("env")) config.getString("env").orEmpty() else ""
    val appId = if (config.hasKey("appId")) config.getString("appId").orEmpty() else ""
    core.initialize(env, appId) { error ->
      if (error != null) promise.reject(error.code, error.message, error) else promise.resolve(null)
    }
  }

  override fun createSession(amount: Double, currency: String, promise: Promise) {
    core.createSession(amount, currency) { result ->
      result.fold(
          onSuccess = { session ->
            promise.resolve(
                Arguments.createMap().apply {
                  putString("sessionId", session.sessionId)
                  putDouble("expiresAt", session.expiresAt)
                })
          },
          onFailure = { error ->
            val code = (error as? SdkCore.SdkException)?.code ?: "E_UNKNOWN"
            promise.reject(code, error.message, error)
          },
      )
    }
  }

  override fun invalidate() {
    core.destroy()
    super.invalidate()
  }

  companion object {
    const val NAME = NativeSdkCoreSpec.NAME
  }
}
