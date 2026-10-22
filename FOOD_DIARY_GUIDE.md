# Nourish Food Diary 2.0

Live app: https://jamesjph91.github.io/nourish-planner/

## What is now available

- **Food diary & scanner** tab. Choose today's date or another day.
- **Actual consumption is separate from the meal plan.** Planned meals never count as eaten until you tap "I ate this", and you can choose 0.5–4 planned portions.
- **Scan barcode** with the phone camera, or enter an EAN/UPC barcode (8–14 digits). Uses Open Food Facts public product records, not a paid food API. You must review nutrition labels. Some barcodes/products are not covered and some nutrients can be missing or wrong.
- **Manual food entries** for any food, drink, takeaway or supplement. Enter name, category, quantity, and nutritional values **per 100g/100ml or per serving**. Record your actual amount eaten.
- **Saved foods** make previously entered products reusable. Daily kcal, protein, carbs, fat and fibre totals appear in the diary and calories/protein on the home dashboard.
- **Daily trend**, seven-day log (unlogged days are not counted as zero), food entry editing/deletion and food diary CSV export.
- Each Google account's diary is in its **own private Firestore document**, included in both cloud sync and Nourish Settings backup/export. There are no new Firebase rules to publish for this feature.

## How to use

1. Open Nourish. Verify the Cloud sync banner confirms your Google account and successful sync.
2. Choose **Food diary & scanner**.
3. To log a Nourish planned meal: choose a date within your current 28-day period, select the portion eaten, then tap **I ate this**. Planned meals are snapshots; later changes to the plan won't rewrite historical intake.
4. For a barcode: tap **Scan barcode**, grant camera permission and point the camera at the barcode; if Safari's camera is unavailable or the external scanner library doesn't load, type the barcode into **Barcode digits → Find product**. The scanner also offers a photo mode on supported devices.
5. Review the fetched nutrition label, choose the amount and meal category, then tap **Add to my diary**.
6. For an unlisted food, use **New manual food** and enter package-label values. Set the unit to **Portions** if your nutrition facts are per portion, not per 100g.
7. Reuse regular foods from **My saved foods**, or export all logged entries with **Export CSV**.

The meal plan and Food Diary each have a different job. The meal plan controls recipes and shopping; the Food Diary records **what was actually eaten**. Manual and barcode additions don't alter recipe shopping lists.

## Privacy and limitations

- All logged products, calories, food history and saved foods are private to each Google account. Partner comparisons do not expose them.
- Camera images are processed by the scanner in the browser; Nourish does not upload scanner camera images into its Firebase documents. The lookup sends only the barcode query to Open Food Facts.
- Barcode data depends on the third-party Open Food Facts API and an external scanner library; camera access requires HTTPS and an eligible browser. A manual fallback is provided.
- Avoid double-counting: if you didn't eat a planned meal, don't mark it as eaten. If you added it manually, don't also log the planned version.
- Energy targets are adjustable **reference targets**, not precise medical advice. We do not automatically "eat back" estimates of energy burned by your watch.
- **Samsung Health / Health Connect automatic sync is not included in this release.** That requires a separate Android-side integration or supported health-data import.
- This feature works with the existing private Firestore security path; no extra Firebase permissions are needed.
- Existing single-document cross-device sync may show a conflict prompt if two devices simultaneously edit the private plan. Resolve conflicts only after exporting a backup of whichever version you wish to keep.

## Developer regression checks

Run: `node --test tests/food-diary.test.cjs`
