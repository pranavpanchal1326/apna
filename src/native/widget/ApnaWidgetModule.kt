package com.apna.widget

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native native module — exposes `refreshAllWidgets()` to JavaScript.
 *
 * Called by `src/lib/widget/widgetRefresh.ts` via NativeModules['ApnaWidgetModule'].
 * Registered in ApnaWidgetPackage and injected into MainApplication by the config plugin.
 */
class ApnaWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ApnaWidgetModule"

    /**
     * Triggers an immediate Glance update on every Balance and Map widget instance.
     * Fire-and-forget from JS — does not return a Promise.
     */
    @ReactMethod
    fun refreshAllWidgets() {
        val ctx: Context = reactApplicationContext
        BalanceWidgetReceiver.requestUpdate(ctx)
        MapWidgetReceiver.requestUpdate(ctx)
    }
}
