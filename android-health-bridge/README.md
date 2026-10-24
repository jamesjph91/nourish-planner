# FORGE Health Connect Bridge — Android prototype

This optional local-only Android companion makes an **on-demand export** of daily activity from the Android Health Connect datastore. It runs on the phone, not the watch, and is deliberately separate from the static FORGE PWA.

## What it does — and does not do

The bridge can read only the Health Connect types you explicitly grant: steps, active calories burned, sleep and resting heart rate. It has **no INTERNET permission**, does not run background sync and does not send data to FORGE or any server. Export happens only when you tap the export control and choose where to save the JSON file.

This is **not native Samsung Health sync** and FORGE does not claim that the website can read a Galaxy Watch directly. Samsung Health may contribute data to Health Connect on supported Android devices; the bridge then reads the Health Connect copy after permission is granted. A new export/import is required whenever you want newer readings in FORGE.

## Before you export

1. Confirm Samsung Health is recording the readings you expect.
2. On supported Android versions, confirm Samsung Health is allowed to share the relevant data types with Health Connect.
3. In Android settings, review the FORGE/Nourish Health Bridge permissions. Grant only the types you want to export.
4. Remember that a missing reading is different from a real zero. If Health Connect has no value for a day/type, the export should leave that metric absent rather than inventing `0`.

## Build and test

Build with Android Studio or run `gradle -p android-health-bridge :app:assembleDebug` using Android SDK 36, Gradle 8.11.1 and Java 17. No API key or paid subscription is required. The debug APK is for testing; it is not a Play Store release and is not production signed.

The repository regression suite also checks the bridge/PWA contract: source labels remain explicit, import values are bounded, malformed files cannot overwrite saved activity, and the UI does not imply automatic Samsung Health or Health Connect sync.

## Export → preview → import workflow

1. Open **FORGE Health Bridge** and grant the Health Connect read permissions you want to use.
2. Tap **Export the last seven days** and save the generated JSON locally.
3. Open the installed FORGE PWA → **Activity** → **Watch activity & imports**.
4. Choose the JSON file. Check the dates and source wording shown by FORGE. Existing dates may already contain manual or previously imported readings, so review conflicts carefully before replacing information.
5. After import, confirm the most recent recorded date and spot-check at least one metric against Samsung Health/Health Connect. Do not treat a blank metric as zero.
6. Keep or delete the exported JSON according to your own privacy preference. Another manual export/import is required to refresh the PWA later.

If an import fails validation, leave the existing FORGE activity unchanged and correct the export/file instead of resetting the app. Do not clear browser storage: workouts, nutrition, account data and IndexedDB progress photos are separate private data and should remain untouched.

## Privacy

The Android manifest grants read scopes only. Permissions are requested interactively and can be denied or revoked. The system document picker creates a JSON file only when requested. The export contains daily summaries for the last seven calendar days rather than raw minute-by-minute heart-rate data.

When you deliberately import that JSON into FORGE, it becomes part of your private FORGE activity data and follows your normal account/cloud settings. Removing a FORGE activity row does not delete the original Samsung Health or Health Connect record.

## Technology and schema

- Kotlin / Android Gradle Plugin 8.9.2, minSdk 28, targetSdk 35.
- `androidx.health.connect:connect-client:1.1.0`.
- `StepsRecord.COUNT_TOTAL`, `ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL`, `SleepSessionRecord.SLEEP_DURATION_TOTAL`, `RestingHeartRateRecord.BPM_AVG`.
- Aggregation windows use local-midnight boundaries so calendar days remain meaningful across daylight-saving changes.
- Export envelope: `{ "app": "nourish-health-connect-bridge", "version": 1, "daily": [...] }`.
- Each imported day is attributed as a Health Connect import; manually entered PWA rows remain labelled manual.

**This is a user-controlled bridge to data already present in Health Connect, not a direct or live Samsung cloud API connection.** Availability depends on the phone, permissions, device data and Samsung Health/Health Connect support.
