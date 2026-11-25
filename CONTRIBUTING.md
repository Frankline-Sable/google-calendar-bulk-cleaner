# Contributing

Thanks for helping improve google-calendar-bulk-cleaner. Bug reports, fixes and ideas are all welcome.

## Set up

You need Node.js 20 or newer.

```bash
git clone https://github.com/Frankline-Sable/google-calendar-bulk-cleaner.git
cd google-calendar-bulk-cleaner
npm ci
npm run check   # lint + tests
```

## Project layout

| Path | What it is |
| --- | --- |
| `src/console/bulk-delete.js` | Script pasted into the browser console on Google Calendar |
| `src/apps-script/bulk-delete.gs` | Script pasted into a Google Apps Script project |
| `test/` | Tests (`node:test`) |
| `test-utils/` | A simulated Calendar page (jsdom) and a mocked `CalendarApp` |
| `docs/` | Longer explanations |

Both scripts are plain, dependency-free files that users copy and paste, so keep
them self-contained: no imports, no build step.

## Making a change

1. Open an issue first for anything larger than a small fix, so we can agree on the approach.
2. Create a branch, make your change, and add or update tests.
3. Run `npm run check`.
4. Add a line under **Unreleased** in `CHANGELOG.md`.
5. Open a pull request and fill in the template.

## Notes on testing

The tests run the scripts against a *simulation* of Google Calendar, not the real
site. Google can change Calendar's page structure at any time, so if you change
a selector or add a new one, also try it by hand on a calendar you do not mind
editing, and say so in the pull request.

When testing deletion by hand, always start with a narrow search term. For the
Apps Script version, run with `DRY_RUN = true` first.

## Style

- Formatting follows `.editorconfig` (2 spaces, LF line endings).
- ESLint must pass with no warnings.
- Prefer waiting for a condition over adding a fixed delay.
