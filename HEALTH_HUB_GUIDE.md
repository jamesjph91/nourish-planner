# Nourish Health Hub · integrated dashboard and Samsung Watch import

Live website: https://jamesjph91.github.io/nourish-planner/

## What works now

- The existing **Dashboard** displays real food logged (not meals merely planned), daily calorie/protein references, recorded step totals, completed Gym Lab sessions, latest body weight and weight change, sleep duration, resting heart rate and recent weighted-lift comparisons.
- The **Health hub & watch** menu is private to each Google account. It lets you set an activity step goal and sleep reference, log watch values by date, inspect fourteen recent records, remove activity entries and import a *supported daily summary* CSV or JSON.
- Data is included in private cloud sync and settings backup. Importing a date again replaces that date's supplied values, not adds duplicate steps/calories.
- If data is missing, the dashboard says **Not logged / Not recorded**. It does not assume you ate zero food.
- Activity calories are shown separately. **They are NOT automatically added to your food allowance**; calorie-burn estimates and recorded Gym Lab sessions can overlap.
- Weight goals are tracked separately from food intake. This app is not a medical assessment.

## Import an activity summary

In **Health hub & watch**, choose a compatible CSV, TSV or JSON file. Do **not** import an arbitrary Samsung Health backup ZIP — that is not parsed by this version.

CSV columns (spelling/case variations accepted):
```text
date,steps,active_kcal,sleep_minutes,resting_bpm
```
Date is YYYY-MM-DD and all numeric values are daily totals, not individual step or heart-rate samples. At least one metric is needed per row. Blanks mean unknown; if imported twice the same date is updated. File size max 1MB and up to 730 source days (400 retained).

Example of JSON companion format:
```json
{
  "app": "nourish-health-connect-bridge",
  "version": 1,
  "daily": [
    {
      "date": "2026-10-21",
      "steps": 12000,
      "activeKcal": 400,
      "sleepMinutes": 460,
      "restingBpm": 57,
      "source": "health-connect"
    }
  ]
}
```
The values above are **fictional documentation examples**, not data about you. Don't import them as real health information.

## Samsung Health and Health Connect

Samsung's guidance: https://developer.samsung.com/health/health-connect-faq.html
Android's guidance: https://developer.android.com/health-and-fitness/health-connect/get-started

1. On Android 13 or earlier install Health Connect from Google Play (Android 14+ has Health Connect built in).
2. In Samsung Health settings, enable sharing with Health Connect if supported on your watch and phone. Grant permissions for steps, activity calories, sleep and resting heart rate where available.
3. This web app **cannot directly access Android's Health Connect datastore**. To import real watch data without manually entering values, use the separate [Android Health Bridge](android-health-bridge/README.md) prototype after building/installing it.
4. The Android companion, once installed and authorised, requests Health Connect access and exports seven days to a local JSON file. Select that file in **Health hub & watch** to import.

### Development status

**Watch-to-Nourish automatic background synchronisation is not implemented.** The native bridge is a separate optional prototype and requires Android installation, approval of requested permissions and physical-device testing. No watch values, personal health information or Google authentication tokens are transmitted by the bridge itself: it has no INTERNET permission. The file you consciously import into the Nourish website then becomes part of your private Google-account backup/sync.

A future fully automatic sync should add a securely authenticated native app using minimum-necessary Health Connect scopes and transparent controls for frequency, history and revocation. Never embed long-lived Firebase auth tokens in public source code.

## QA and updates

- Web regression suite: `node --test tests/*.test.cjs`
- GitHub Actions runs syntax checks and the web regression suite on changes.
- Installed PWAs refresh via the versioned service worker. If the UI is old, close and reopen the app; do not clear storage until you've exported your private backup.
