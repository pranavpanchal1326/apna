package com.apna.widget

import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.GlanceId
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider
import androidx.glance.action.actionStartActivity
import androidx.glance.GlanceModifier
import androidx.glance.background
import androidx.glance.clickable
import android.graphics.Color
import androidx.glance.LocalContext
import androidx.glance.LocalGlanceId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Balance Widget — shows the current user's net balance in the active group.
 *
 * Data flow: RN app → apna_widget_data.json (FileSystem.documentDirectory)
 *            → WidgetDataReader.getBalanceData() → Glance UI
 *
 * Deep link on tap: apna://budget?groupId=<groupId>
 */
class BalanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = WidgetDataReader.getBalanceData(context)

        val groupId    = data?.optString("groupId", "")    ?: ""
        val groupName  = data?.optString("groupName", "apna") ?: "apna"
        val balRupees  = data?.optDouble("balanceRupees", 0.0) ?: 0.0
        val label      = data?.optString("label", "All settled") ?: "All settled"
        val updatedAt  = data?.optString("updatedAt", "") ?: ""

        // Determine color from balance sign
        val balanceHex = when {
            balRupees > 0.0  -> "#4ECDC4" // teal — you are owed
            balRupees < 0.0  -> "#FF6B6B" // red  — you owe
            else             -> "#8A94B0" // muted — settled
        }

        // Format absolute value
        val absValue   = Math.abs(balRupees)
        val formatted  = "₹${String.format("%.0f", absValue)}"

        // Build deep-link intent
        val intent = android.content.Intent(
            android.content.Intent.ACTION_VIEW,
            android.net.Uri.parse("apna://budget?groupId=$groupId")
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        provideContent {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(Color.parseColor("#0D1424")))
                    .clickable(actionStartActivity(intent))
                    .padding(16.dp),
                contentAlignment = Alignment.TopStart
            ) {
                Column(
                    modifier = GlanceModifier.fillMaxSize(),
                    verticalAlignment = Alignment.Vertical.Top
                ) {
                    // App label
                    Text(
                        text = "apna",
                        style = TextStyle(
                            color = ColorProvider(Color.parseColor("#4ECDC4")),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Spacer(modifier = GlanceModifier.height(4.dp))

                    // Group name
                    Text(
                        text = groupName,
                        style = TextStyle(
                            color = ColorProvider(Color.parseColor("#8A94B0")),
                            fontSize = 11.sp
                        ),
                        maxLines = 1
                    )
                    Spacer(modifier = GlanceModifier.height(8.dp))

                    // Balance amount
                    Text(
                        text = formatted,
                        style = TextStyle(
                            color = ColorProvider(Color.parseColor(balanceHex)),
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Spacer(modifier = GlanceModifier.height(2.dp))

                    // Label
                    Text(
                        text = label,
                        style = TextStyle(
                            color = ColorProvider(Color.parseColor("#8A94B0")),
                            fontSize = 11.sp
                        )
                    )
                    Spacer(modifier = GlanceModifier.defaultWeight())

                    // Last updated
                    if (updatedAt.isNotEmpty()) {
                        val shortTime = runCatching {
                            val instant = java.time.Instant.parse(updatedAt)
                            val local = java.time.ZonedDateTime.ofInstant(
                                instant, java.time.ZoneId.systemDefault()
                            )
                            String.format("%02d:%02d", local.hour, local.minute)
                        }.getOrElse { "" }

                        if (shortTime.isNotEmpty()) {
                            Text(
                                text = "Updated $shortTime",
                                style = TextStyle(
                                    color = ColorProvider(Color.parseColor("#4A5275")),
                                    fontSize = 9.sp
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * BroadcastReceiver that registers BalanceWidget with the Android launcher.
 */
class BalanceWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = BalanceWidget()

    companion object {
        /**
         * Programmatic refresh — called from ApnaWidgetModule.refreshAllWidgets().
         */
        fun requestUpdate(context: Context) {
            CoroutineScope(Dispatchers.IO).launch {
                val manager = GlanceAppWidgetManager(context)
                val ids = manager.getGlanceIds(BalanceWidget::class.java)
                ids.forEach { id -> BalanceWidget().update(context, id) }
            }
        }
    }
}
