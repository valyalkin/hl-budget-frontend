#!/usr/bin/env node
// Prints a CSV of N valid rows for the import's size and speed checks (specs/004-csv-import
// SC-005): node e2e/fixtures/make-csv.mjs 1000 > big.csv
// Day-first dates in the last 90 days, 5 merchants, default categories, account "E2E card".
const count = Number(process.argv[2] ?? 1000);
const mark = process.argv[3] ?? 'e2e-big';
const merchants = [
  'Corner Bakery',
  'Transit fare',
  'Harbour Coffee',
  'City Library',
  'Hardware Depot',
];
const categories = [
  'Groceries',
  'Public Transport',
  'Groceries',
  'Education',
  'Household',
];
const pad = (n) => String(n).padStart(2, '0');
const lines = ['Date,Merchant,Category,Account,Amount'];
for (let i = 0; i < count; i++) {
  const day = new Date(Date.now() - ((i % 90) + 1) * 86_400_000);
  const date = `${pad(day.getDate())}/${pad(day.getMonth() + 1)}/${day.getFullYear()}`;
  const amount = `${(i % 99) + 1}.${pad(i % 100)}`;
  lines.push(
    `${date},${mark} ${merchants[i % 5]},${categories[i % 5]},E2E card,${amount}`,
  );
}
process.stdout.write(lines.join('\n') + '\n');
