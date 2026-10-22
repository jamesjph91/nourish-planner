# Nourish Health Connect Bridge — Android prototype

This optional local-only Android application makes an **on-demand export** of daily health activity from the Health Connect datastore. It is intended for Android phones (including Android 13 with the Health Connect app), not for the watch itself.

## Privacy

The Android manifest grants only read scopes for steps, active calories burned, sleep and resting heart rate. Those permissions are **requested interactively** and can be denied or revoked. It has **no INTERNET permission**, does not run background jobs and sends nothing to Nourish or to any server. It uses Android's system document picker to create a JSON file only when the user explicitly requests export. That file contains the **last seven calendar days** (not raw minute-by-minute heart rate).

Permission rationale: these activity values allow Nourish to present context alongside food logging, gym sessions and weight history after you deliberately import the JSON file. They are not used for advertising or diagnosis, and are not shared with friends by default.

When the generated JSON is imported into the Nourish website, the web app's existing per-Google-account private Firebase plan document stores the daily summary. The user's normal cloud sync settings then apply. Delete an imported daily summary via Health hub & watch, or revoke Health Connect access in Android settings.

## Setup and use (prototype)

1. Install the Android Health Connect app if your OS is Android 13 or older, and grant Samsung Health permission to share relevant types through Health Connect.
2. Build with Android Studio or run `gradle -p android-health-bridge :app:assembleDebug` using Android SDK 36, Gradle 8.11.1 and Java 17. No keys or API subscription are required for the local bridge.
3. Install the debug APK for **testing** in an Android device. It is **not a published Play Store app** and has **not been verified on a physical Galaxy Watch**. Check the package permissions carefully.
4. Open **Nourish Health Bridge**, allow its requested Health Connect read permissions, and tap **Export the last seven days**.
5. Save JSON on the phone. Open the installed Nourish website/app → **Health hub & watch** → choose the generated file.
6. Data appears on your Nourish dashboard. The companion requires another manual export to refresh it.

Build outputs, if CI succeeds, are visible in GitHub Actions under the `Nourish Android Health Bridge build` workflow. Debug APKs are not production-release signed and should not be considered formally supported releases.

## Technology

- Kotlin / Android Gradle Plugin 8.9.2, minSdk 28, targetSdk 35.
- androidx.health.connect:connect-client:1.1.0.
- `StepsRecord.COUNT_TOTAL`, `ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL`, `SleepSessionRecord.SLEEP_DURATION_TOTAL`, `RestingHeartRateRecord.BPM_AVG`.
- Aggregation windows use local midnight boundaries, accounting for daylight-saving time.
- Export format: `{ "app": "nourish-health-connect-bridge", "version": 1, "daily": [...] }`.

**This is a bridge to the data already in Health Connect, not a direct live Samsung cloud API connection.** Whether a field has data depends on your devices, permissions and the Samsung Health/Health Connect syncing support.

Relevant docs:
- https://developer.android.com/health-and-fitness/health-connect/get-started
- https://developer.samsung.com/health/health-connect-faq.html
