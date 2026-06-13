package com.apna.widget

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * ReactPackage — registers ApnaWidgetModule with the React Native bridge.
 * This class is referenced by the Expo config plugin (withApnaWidgets.ts)
 * which injects it into MainApplication.kt during `npx expo prebuild`.
 */
class ApnaWidgetPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(ApnaWidgetModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
