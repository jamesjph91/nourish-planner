# FORGE: remaining native and shared-service engineering

This is the implementation contract for features which cannot be delivered honestly by the static GitHub Pages app alone. The web app currently supports manual/imported activity and opt-in private comparison features. **This file is planning guidance, not evidence that automatic syncing or community accounts are live.**

## Native Android companion: Health Connect

- Provide an Android app with an explicit Health Connect permission flow. Read only user-approved daily steps, sleep duration, active energy and resting heart rate.
- Export the already supported FORGE import format. This permits a useful first milestone without modifying the web planner's state schema or exposing an unauthenticated write endpoint:

```json
{
  "app": "nourish-health-connect-bridge",
  "version": 1,
  "daily": [
    {
      "date": "2026-10-22",
      "steps": 8512,
      "activeKcal": 365,
      "sleepMinutes": 440,
      "restingBpm": 64
    }
  ]
}
```

- Show data provenance (Health Connect versus manual versus import), last sync time and permission status.
- Handle duplicate daily records by date and preserve manually entered values where no incoming value exists.
- Never require fitness data or background permission for ordinary meal or workout tracking.
- Run Android instrumentation tests with sample records and permission denial. Verify current Android SDK and Health Connect permissions before implementation.
- A later direct sync must use a securely authenticated endpoint, not publicly accessible client secrets stored in GitHub Pages.

## Secure FORGE Community

1. Keep private medical, weight and food records private by default. Require explicit consent to share a narrow challenge statistic.
2. Create signed-in user and friends/challenge membership records with server-enforced per-user access controls. Enforce membership and ownership server-side.
3. Use opaque membership identifiers and invitation expiry; prevent enumeration and unauthorised lookup.
4. Allow revocation, leaving a group, deletion of challenges and removal of shared snapshots.
5. Define accessible, moderation-ready conduct/report functions before public discovery or leaderboards.
6. Use aggregate opt-in values only (e.g. sessions completed in a period); never expose raw diaries, activity exports or body measurements.
7. Add integration tests for cross-account access denial, rate limits, expired invitations, deletion and rejoin.
8. Roll out to a small private beta before any public community features.

## Release gates

- V34: Seven-day real-data review, personal best sets, portion shortcuts and backup visibility — implemented with automated regression coverage.
- V35: Generated weekly meal plan preview/apply/undo — implemented with regression coverage.
- Native sync: not implemented; the web app currently supports manual and file-based imports.
- New public or private shared community services: not implemented; existing opt-in comparison features are unchanged.

Preserve storage key `nourishHigherDeficitV1`, legacy import/backups and cloud-data validation in every migration. Do not delete IndexedDB photo journals during update or migration.
