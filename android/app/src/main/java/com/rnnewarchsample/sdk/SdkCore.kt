package com.rnnewarchsample.sdk

import android.os.Handler
import android.os.HandlerThread
import java.util.UUID

/**
 * Platform SDK logic. Knows nothing about React Native — [SdkCoreModule]
 * adapts it to the codegen-generated `NativeSdkCoreSpec`.
 */
class SdkCore(private val onStatusChange: (String) -> Unit) {

  class SdkException(val code: String, message: String) : Exception(message)

  data class Session(val sessionId: String, val expiresAt: Double)

  private val thread = HandlerThread("RNNewArchSample-SdkCore").apply { start() }
  private val handler = Handler(thread.looper)

  // Only touched on [thread].
  private var environment: String? = null

  fun initialize(env: String, appId: String, callback: (SdkException?) -> Unit) {
    handler.post {
      when {
        env !in SUPPORTED_ENVIRONMENTS ->
            callback(SdkException(E_INVALID_CONFIG, "env must be SANDBOX or PROD, got '$env'"))
        appId.isBlank() -> callback(SdkException(E_INVALID_CONFIG, "appId must not be empty"))
        else -> {
          environment = env
          onStatusChange("INITIALIZED")
          callback(null)
        }
      }
    }
  }

  fun createSession(amount: Double, currency: String, callback: (Result<Session>) -> Unit) {
    handler.post {
      val env = environment
      when {
        env == null ->
            callback(fail(E_NOT_INITIALIZED, "Call initialize() before createSession()"))
        !(amount > 0 && amount.isFinite()) -> callback(fail(E_INVALID_AMOUNT, "amount must be > 0"))
        currency.length != 3 ->
            callback(fail(E_INVALID_CURRENCY, "currency must be an ISO-4217 code"))
        else -> {
          onStatusChange("CREATING_SESSION")
          // Simulated network latency — a real SDK would call its backend here.
          handler.postDelayed(
              {
                val prefix = if (env == "PROD") "prod" else "sbx"
                val session =
                    Session(
                        sessionId = "${prefix}_${UUID.randomUUID()}",
                        expiresAt = (System.currentTimeMillis() + SESSION_TTL_MS).toDouble(),
                    )
                onStatusChange("SESSION_CREATED")
                callback(Result.success(session))
              },
              SIMULATED_LATENCY_MS,
          )
        }
      }
    }
  }

  fun destroy() {
    thread.quitSafely()
  }

  private fun fail(code: String, message: String) = Result.failure<Session>(SdkException(code, message))

  companion object {
    const val SDK_NAME = "RNNewArchSample SDK"
    const val SDK_VERSION = "1.0.0"

    const val E_INVALID_CONFIG = "E_INVALID_CONFIG"
    const val E_NOT_INITIALIZED = "E_NOT_INITIALIZED"
    const val E_INVALID_AMOUNT = "E_INVALID_AMOUNT"
    const val E_INVALID_CURRENCY = "E_INVALID_CURRENCY"

    private val SUPPORTED_ENVIRONMENTS = setOf("SANDBOX", "PROD")
    private const val SESSION_TTL_MS = 15 * 60 * 1000L
    private const val SIMULATED_LATENCY_MS = 600L
  }
}
