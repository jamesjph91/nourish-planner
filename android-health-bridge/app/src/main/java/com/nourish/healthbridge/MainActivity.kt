package com.nourish.healthbridge

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * Offline-only, user-initiated Health Connect reader.
 * This companion never transmits health data or stores an authentication token.
 * It writes a short daily aggregate to a document selected by the user, who can
 * import that JSON through Nourish > Health hub & watch.
 */
class MainActivity : ComponentActivity() {
    private lateinit var status: TextView
    private lateinit var exportButton: Button
    private var pendingJson: String? = null

    private val readPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class)
    )

    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        status.text = if (granted.containsAll(readPermissions)) {
            "Health Connect permissions granted. You can export the last seven days."
        } else {
            "Some permissions weren't granted. This companion needs read access to steps, " +
                "active calories, sleep and resting heart rate to prepare the complete export. " +
                "You can change these permissions in Health Connect."
        }
    }

    private val saveDocument = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri: Uri? ->
        val payload = pendingJson
        pendingJson = null
        if (uri == null || payload == null) {
            status.text = "Export cancelled. No data was uploaded."
            return@registerForActivityResult
        }
        try {
            val stream = contentResolver.openOutputStream(uri)
                ?: throw IllegalStateException("Cannot open the selected file.")
            stream.bufferedWriter(Charsets.UTF_8).use { it.write(payload) }
            status.text = "Export saved to your chosen file. Open Nourish → Health hub & watch " +
                "→ Import and select this file. Nothing was uploaded automatically."
        } catch (e: Exception) {
            status.text = "Export failed: " + (e.message ?: "File could not be saved.")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val margin = (16 * resources.displayMetrics.density).toInt()

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(margin, margin, margin, margin)
        }
        val scroll = ScrollView(this).apply { addView(layout) }
        setContentView(scroll)

        fun text(value: String, large: Boolean = false): TextView {
            return TextView(this).apply {
                this.text = value
                textSize = if (large) 22f else 16f
                setPadding(0, margin / 3, 0, margin / 3)
                layout.addView(this)
            }
        }
        fun button(value: String, action: () -> Unit): Button {
            return Button(this).apply {
                text = value
                isAllCaps = false
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
                setOnClickListener { action() }
                layout.addView(this)
            }
        }

        text("Nourish Health Connect Bridge", large = true)
        text(
            "This optional companion reads seven days of your steps, active calories, " +
            "sleep duration and resting heart rate from Android Health Connect, only " +
            "after you grant permission. It never accesses GPS, nutrition, contacts, or photos."
        )
        text(
            "Your readings stay on this phone. You choose whether and where to save " +
            "a JSON file, then you import it into Nourish yourself. There is no automatic " +
            "upload and no background monitoring."
        )

        status = text("Checking Health Connect…")
        button("1. Grant Health Connect read permissions") { askPermission() }
        exportButton = button("2. Export the last seven days (JSON)") { exportDays() }
        button("Health Connect settings") {
            try {
                startActivity(Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS))
            } catch (_: Exception) {
                status.text = "Open Health Connect manually in your Android settings."
            }
        }

        if (HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE) {
            status.text = "Health Connect is available. Grant read permission before exporting."
        } else {
            exportButton.isEnabled = false
            status.text = "Health Connect is not available or needs updating. On Android 13 or earlier " +
                "install/update Health Connect from Google Play, then allow Samsung Health to share data."
        }
    }

    private fun askPermission() {
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
            status.text = "Install or update Health Connect before granting access."
            return
        }
        requestPermissions.launch(readPermissions)
    }

    private fun exportDays() {
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
            status.text = "Health Connect is unavailable."
            return
        }
        exportButton.isEnabled = false
        status.text = "Reading seven days of granted Health Connect data…"
        lifecycleScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(this@MainActivity)
                val allowed = client.permissionController.getGrantedPermissions()
                if (!allowed.containsAll(readPermissions)) {
                    status.text = "Grant all four read permissions first, or open Health Connect settings."
                    return@launch
                }
                val result = readRecentDays(client)
                pendingJson = result
                status.text = "Readings are ready. Choose where to save the local JSON file."
                saveDocument.launch("nourish-health-connect.json")
            } catch (e: Exception) {
                pendingJson = null
                status.text = "Could not read Health Connect: " + (e.message ?: "Unknown error")
            } finally {
                exportButton.isEnabled = true
            }
        }
    }

    private suspend fun readRecentDays(client: HealthConnectClient): String {
        val now = LocalDate.now()
        val zone = ZoneId.systemDefault()
        val daily = JSONArray()
        for (offset in 6 downTo 0) {
            val date = now.minusDays(offset.toLong())
            // Use local midnights, not 24h offsets: DST days may be 23/25 hours.
            val start = date.atStartOfDay(zone).toInstant()
            val end = date.plusDays(1).atStartOfDay(zone).toInstant()
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(
                        StepsRecord.COUNT_TOTAL,
                        ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
                        SleepSessionRecord.SLEEP_DURATION_TOTAL,
                        RestingHeartRateRecord.BPM_AVG
                    ),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            val record = JSONObject()
            record.put("date", date.toString())
            record.put("source", "health-connect")
            result[StepsRecord.COUNT_TOTAL]?.let { record.put("steps", it) }
            result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.let {
                record.put("activeKcal", Math.round(it.inKilocalories * 10.0) / 10.0)
            }
            result[SleepSessionRecord.SLEEP_DURATION_TOTAL]?.let {
                record.put("sleepMinutes", it.toMinutes())
            }
            result[RestingHeartRateRecord.BPM_AVG]?.let {
                record.put("restingBpm", it)
            }
            if (record.length() > 2) daily.put(record)
        }
        return JSONObject()
            .put("app", "nourish-health-connect-bridge")
            .put("version", 1)
            .put("daily", daily)
            .toString(2)
    }
}
