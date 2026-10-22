# Nourish: accounts and gym partner comparison

## Separate accounts
Each person opens https://jamesjph91.github.io/nourish-planner/ and signs in with their own Google account. Every user's private nutrition, shopping, gym and measurement records are under the authenticated Firebase UID. The same basic meal-plan template appears for a new account, but each user may independently customise targets, meals, gym days and logs.

Progress & friends now supports nickname, weight goal, weigh-ins, waist/chest/hips/arm/thigh measurements and body-fat scale estimates, plus history charts.

## REQUIRED: Publish the Firestore rules
GitHub Pages does not publish Firebase Security Rules automatically. Open the Firebase project nourish-planner-116e7 and choose Firestore Database → Rules. Copy the COMPLETE rules from:
https://github.com/jamesjph91/nourish-planner/blob/main/firestore.rules

Paste into the rules editor and press Publish. This preserves the existing private per-user records while allowing highly restricted invitation summaries. Do not use open read/write rules.

Until you publish these rules, private nutrition and fitness sync can still work, but creating/joining partner invitations will return permission-denied.

## Connect two gym partners
1. Person A signs in using their own Google account, opens Progress & friends, saves a nickname, and taps Create invite code.
2. Person A sends the generated 32-character code privately to Person B.
3. Person B signs in using a DIFFERENT Google account, opens Progress & friends and enters the code in Join invitation.
4. Both tap Refresh comparison. Each person selects which statistics may be shared and explicitly taps Publish my shared summary.
5. Tapping Refresh comparison displays the latest published snapshots side-by-side.
6. Hide my shared summary removes the publicly readable shared snapshot; Leave / remove connection breaks the group. Private accounts are unaffected.

Only approved snapshots can be read by the two members of the group, enforced by Firestore rules. Daily measurements, food plans, grocery data, weight goals and workout sets remain fully private.

## Limitations
Comparisons are currently one-to-one and require internet access. Published summaries need to be re-published after new measurements or workouts; they do not update automatically. Weight and body-fat changes are not a direct measure of muscle gain. New accounts start with the same default meal plan; their independent customisations and calories can be adjusted in Settings.
