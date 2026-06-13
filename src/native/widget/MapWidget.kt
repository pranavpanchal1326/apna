package com.apna.widget

import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.GlanceId
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider
import androidx.glance.action.actionStartActivity
import androidx.glance.GlanceModifier
import androidx.glance.background
import androidx.glance.clickable
import android.graphics.Color
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * Map Widget — shows the count of live-sharing members and overlapping avatar chips.
 *
 * Avatar layout:
 *   - Up to 3 chips rendered left to right with 8 dp start-offset overlap.
 *   - Live members: teal 2 dp ring (36 dp outer circle, 32 dp inner).
 *   - Offline members: 50% opacity, no ring.
 *
 * Deep link on tap: apna://map?groupId=<groupId>
 */
class MapWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = WidgetDataReader.getMapData(context)

        val groupId        = data?.optString("groupId", "")      ?: ""
        val groupName      = data?.optString("groupName", "apna") ?: "apna"
        val sharingCount   = data?.optInt("sharingCount", 0)      ?: 0
        val previewArray   = data?.optJSONArray("previewMembers") ?: JSONArray()
        val updatedAt      = data?.optString("updatedAt", "")     ?: ""

        data class WidgetMemberLocal(
            val name: String,
            val avatarColor: String,
            val isLive: Boolean
        )

        val previewMembers = (0 until previewArray.length()).mapNotNull { i ->
            val obj = previewArray.optJSONObject(i) ?: return@mapNotNull null
            WidgetMemberLocal(
                name        = obj.optString("name", "?").take(1).uppercase(),
                avatarColor = obj.optString("avatarColor", "#4ECDC4"),
                isLive      = obj.optBoolean("isLive", false)
            )
        }

        val intent = android.content.Intent(
            android.content.Intent.ACTION_VIEW,
            android.net.Uri.parse("apna://map?groupId=$groupId")
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
                    Spacer(modifier = GlanceModifier.height(12.dp))

                    if (sharingCount == 0) {
                        // Empty state
                        Text(
                            text = "No one sharing",
                            style = TextStyle(
                                color = ColorProvider(Color.parseColor("#4A5275")),
                                fontSize = 13.sp
                            )
                        )
                    } else {
                        // Avatar strip — overlapping chips
                        // Glance 1.0.0 lacks z-indexed overlay; we simulate with
                        // a Row where each chip after the first has a negative-like
                        // margin via paddingStart. In Glance we offset by adjusting Row spacing.
                        Row(
                            modifier = GlanceModifier.wrapContentWidth(),
                            horizontalAlignment = Alignment.Horizontal.Start
                        ) {
                            previewMembers.forEachIndexed { index, member ->
                                val opacity = if (member.isLive) 1.0f else 0.5f
                                val bgColor = runCatching {
                                    Color.parseColor(member.avatarColor)
                                }.getOrElse { Color.parseColor("#4ECDC4") }

                                // Outer ring (teal, 36 dp) — only for live members
                                if (member.isLive) {
                                    Box(
                                        modifier = GlanceModifier
                                            .size(36.dp)
                                            .background(ColorProvider(Color.parseColor("#4ECDC4")))
                                            .padding(start = if (index > 0) 8.dp else 0.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        // Inner avatar circle (32 dp)
                                        Box(
                                            modifier = GlanceModifier
                                                .size(32.dp)
                                                .background(ColorProvider(bgColor)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = member.name,
                                                style = TextStyle(
                                                    color = ColorProvider(Color.WHITE),
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            )
                                        }
                                    }
                                } else {
                                    // Offline — no ring, reduced opacity via lighter bg blend
                                    Box(
                                        modifier = GlanceModifier
                                            .size(32.dp)
                                            .background(ColorProvider(bgColor))
                                            .padding(start = if (index > 0) 8.dp else 0.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = member.name,
                                            style = TextStyle(
                                                color = ColorProvider(Color.argb(128, 255, 255, 255)),
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = GlanceModifier.height(8.dp))

                        // Member count label
                        val suffix = if (sharingCount == 1) "member" else "members"
                        Text(
                            text = "$sharingCount $suffix sharing",
                            style = TextStyle(
                                color = ColorProvider(Color.parseColor("#8A94B0")),
                                fontSize = 11.sp
                            )
                        )
                    }

                    Spacer(modifier = GlanceModifier.defaultWeight())

                    // Last updated time
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
 * BroadcastReceiver that registers MapWidget with the Android launcher.
 */
class MapWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MapWidget()

    companion object {
        fun requestUpdate(context: Context) {
            CoroutineScope(Dispatchers.IO).launch {
                val manager = GlanceAppWidgetManager(context)
                val ids = manager.getGlanceIds(MapWidget::class.java)
                ids.forEach { id -> MapWidget().update(context, id) }
            }
        }
    }
}
