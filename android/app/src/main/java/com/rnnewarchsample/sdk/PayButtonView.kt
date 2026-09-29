package com.rnnewarchsample.sdk

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView

/** Plain Android view backing the `PayButton` Fabric component. */
class PayButtonView(context: Context) : FrameLayout(context) {

  var onPress: (() -> Unit)? = null

  private val density = resources.displayMetrics.density
  private val title =
      TextView(context).apply {
        gravity = Gravity.CENTER
        textSize = 17f
        typeface = Typeface.DEFAULT_BOLD
      }
  private val spinner =
      ProgressBar(context).apply {
        isIndeterminate = true
        visibility = GONE
      }
  private val background = GradientDrawable().apply { cornerRadius = 12 * density }

  private var label = ""
  private var amount = ""
  private var isDisabled = false
  private var isOutline = false
  private var isLoading = false

  init {
    addView(title, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    val spinnerSize = (24 * density).toInt()
    addView(spinner, LayoutParams(spinnerSize, spinnerSize, Gravity.CENTER))
    setBackground(background)
    isClickable = true
    setOnClickListener {
      if (!isDisabled && !isLoading) {
        onPress?.invoke()
      }
    }
    applyStyle()
  }

  fun setLabel(value: String) {
    label = value
    applyStyle()
  }

  fun setAmount(value: String) {
    amount = value
    applyStyle()
  }

  fun setDisabled(value: Boolean) {
    isDisabled = value
    applyStyle()
  }

  fun setVariant(value: String) {
    isOutline = value == "outline"
    applyStyle()
  }

  fun setLoading(value: Boolean) {
    isLoading = value
    applyStyle()
  }

  private fun applyStyle() {
    val textColor = if (isOutline) BRAND else Color.WHITE
    title.text = if (amount.isEmpty()) label else "$label · $amount"
    title.setTextColor(textColor)
    title.visibility = if (isLoading) INVISIBLE else VISIBLE
    spinner.visibility = if (isLoading) VISIBLE else GONE
    spinner.indeterminateTintList = ColorStateList.valueOf(textColor)
    background.setColor(if (isOutline) Color.TRANSPARENT else BRAND)
    background.setStroke((2 * density).toInt(), BRAND)
    alpha = if (isDisabled) 0.45f else 1f
    isEnabled = !isDisabled && !isLoading
  }

  private companion object {
    val BRAND = Color.rgb(107, 69, 242)
  }
}
