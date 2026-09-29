package com.rnnewarchsample.sdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

/** Direct event matching `onPayPress: DirectEventHandler<{timestamp: Double}>`. */
class PayPressEvent(surfaceId: Int, viewId: Int, private val timestamp: Double) :
    Event<PayPressEvent>(surfaceId, viewId) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap =
      Arguments.createMap().apply { putDouble("timestamp", timestamp) }

  companion object {
    const val EVENT_NAME = "topPayPress"
    const val REGISTRATION_NAME = "onPayPress"
  }
}
