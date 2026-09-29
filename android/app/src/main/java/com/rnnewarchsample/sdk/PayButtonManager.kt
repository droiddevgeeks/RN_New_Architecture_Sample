package com.rnnewarchsample.sdk

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.PayButtonManagerDelegate
import com.facebook.react.viewmanagers.PayButtonManagerInterface

/** Fabric view manager backed by the codegen-generated interface + delegate. */
@ReactModule(name = PayButtonManager.NAME)
class PayButtonManager : SimpleViewManager<PayButtonView>(), PayButtonManagerInterface<PayButtonView> {

  private val delegate: ViewManagerDelegate<PayButtonView> = PayButtonManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<PayButtonView> = delegate

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): PayButtonView =
      PayButtonView(context).apply {
        onPress = {
          val surfaceId = UIManagerHelper.getSurfaceId(context)
          UIManagerHelper.getEventDispatcherForReactTag(context, id)
              ?.dispatchEvent(PayPressEvent(surfaceId, id, System.currentTimeMillis().toDouble()))
        }
      }

  @ReactProp(name = "label")
  override fun setLabel(view: PayButtonView, value: String?) = view.setLabel(value.orEmpty())

  @ReactProp(name = "amount")
  override fun setAmount(view: PayButtonView, value: String?) = view.setAmount(value.orEmpty())

  @ReactProp(name = "disabled")
  override fun setDisabled(view: PayButtonView, value: Boolean) = view.setDisabled(value)

  @ReactProp(name = "variant")
  override fun setVariant(view: PayButtonView, value: String?) =
      view.setVariant(value ?: "primary")

  override fun setLoading(view: PayButtonView, isLoading: Boolean) = view.setLoading(isLoading)

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
      mapOf(PayPressEvent.EVENT_NAME to mapOf("registrationName" to PayPressEvent.REGISTRATION_NAME))

  companion object {
    const val NAME = "PayButton"
  }
}
