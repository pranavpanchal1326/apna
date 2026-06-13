package com.apna.widget

import android.content.Context
import org.json.JSONObject
import java.io.File

object WidgetDataReader {

    private const val FILENAME = "apna_widget_data.json"

    fun readData(context: Context): JSONObject? {
        return try {
            // context.filesDir matches FileSystem.documentDirectory on Android
            val file = File(context.filesDir, FILENAME)
            if (!file.exists()) return null
            JSONObject(file.readText())
        } catch (e: Exception) {
            null
        }
    }

    fun getBalanceData(context: Context): JSONObject? {
        return readData(context)?.optJSONObject("balance")
    }

    fun getMapData(context: Context): JSONObject? {
        return readData(context)?.optJSONObject("map")
    }
}
