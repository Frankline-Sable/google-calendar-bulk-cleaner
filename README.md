# google-calendar-bulk-cleaner

[![CI](https://github.com/Frankline-Sable/google-calendar-bulk-cleaner/actions/workflows/ci.yml/badge.svg)](https://github.com/Frankline-Sable/google-calendar-bulk-cleaner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Bulk delete Google Calendar events by searching their **title and description**, without case sensitivity.

Search for `LSD` to match titles, or for `AppSyncId` to match events created by an app that writes an ID into the description, such as `[AppSyncId: WKT-S11]`.

> **Warning:** deleting events cannot be undone from these scripts. Start with a narrow search term, and use the Apps Script version's dry run first. See [Safety](#safety).

## Features

- Searches event titles **and** descriptions
- Case-insensitive matching
- Two ways to run it: a fast server-side Google Apps Script, or a script you paste into the browser console
- Handles recurring events
- Dry-run mode (Apps Script) that lists what would be deleted
- No installation, accounts or API keys for the scripts themselves
- Automated tests and CI

## Which version should I use?

| | Apps Script | Browser console |
| --- | --- | --- |
| Speed | Fast: no popups are opened | Slower: each event is opened once to read its description |
| Dry run | Yes (on by default) | No |
| Date range | You choose it | Months from the one on screen, up to a limit you enter |
| Searches | Title and description | Title, then the details popup of every other event |
| Depends on Google Calendar's page layout | No | Yes, so Google can break it |
| Best for | Large clean-ups | Quick, small jobs |

For anything more than a handful of events, use the Apps Script version.

## Quick start: Google Apps Script (recommended)

1. Open [script.google.com](https://script.google.com) and create a **New project**.
2. Replace the contents of the editor with [`src/apps-script/bulk-delete.gs`](src/apps-script/bulk-delete.gs).
3. Set the options at the top of the file (see the table below). At minimum, set `SEARCH_TEXT`.
4. Save, choose the `bulkDelete` function, and click **Run**. The first run asks you to authorize access to your calendar.
5. Read the execution log. With `DRY_RUN = true` it lists every event that would be deleted.
6. If the list is right, set `DRY_RUN = false` and run again.

| Option | Default | Meaning |
| --- | --- | --- |
| `SEARCH_TEXT` | `''` (required) | Text to find in titles and descriptions, not case sensitive |
| `CALENDAR_NAME` | `''` | Calendar to clean. Empty means your default calendar. Must match the name exactly |
| `START_DATE` / `END_DATE` | one year back / one year ahead | Date range to search |
| `DRY_RUN` | `true` | `true` only lists matches. `false` deletes them |

If the run reaches Apps Script's time limit it stops and says so. Run it again to continue; events already deleted will not match again.

## Quick start: browser console

1. Open [Google Calendar](https://calendar.google.com) in **Month** view.
2. Open the browser's developer console (Chrome: `F12`, or `Ctrl+Shift+J` / `Cmd+Option+J`).
3. Paste the entire contents of [`src/console/bulk-delete.js`](src/console/bulk-delete.js) and press Enter. If the browser blocks pasting, type `allow pasting` and press Enter first.
4. Enter how many months to process (default 12), then the text to search for.
5. Read the confirmation message and click OK to start. Keep the tab open and visible until the "complete" message appears.

Options at the top of the script:

| Option | Default | Meaning |
| --- | --- | --- |
| `SEARCH_DESCRIPTION` | `true` | Also search descriptions. Set to `false` for a fast title-only search |
| `TIMING` | see file | How long to wait for the page. Raise `popupSettleMs` if descriptions are missed |
| `ADVANCED_MODE` | `false` | Set to `true` to be asked for Calendar's button labels, needed if Calendar is not in English |

More detail is in [How it works](docs/how-it-works.md). If something goes wrong, see [Troubleshooting](docs/troubleshooting.md).

## How matching works

- The text is compared without regard to case, so `appsyncid` matches `AppSyncId`.
- An event matches if its title or its description contains the text anywhere.
- The Apps Script version compares only the title and description.
- The console script reads the event's details popup, which also shows things like the location. A very common word can therefore match events you did not intend. Use specific text.

## Safety

- Deletion is real. Start with a narrow search term.
- Use `DRY_RUN = true` in the Apps Script version first and read the list.
- Google Calendar has a Trash where deleted events can often be restored for a limited time. Check it first if you deleted the wrong events, but do not rely on it.
- Only paste code you have read. Both scripts are plain, dependency-free files, so you can read them before running them.
- The scripts act on your own calendar through your own account. They send nothing anywhere else.

## Limitations

- The console script depends on Google Calendar's page structure, which Google can change without notice. If it stops working, please open an issue.
- The console script only sees events shown on the page. In Month view, events hidden behind a "+N more" link are not seen.
- The console script's default button labels are English. Use `ADVANCED_MODE` for other languages.
- Recurring events are removed one instance at a time. Deleting a whole series is not supported.

## Development

You need Node.js 20 or newer.

```bash
npm ci
npm run lint
npm test
```

The tests run both scripts against simulated versions of Google Calendar and Apps Script. They cannot prove that the real Google Calendar page behaves the same, so see [CONTRIBUTING.md](CONTRIBUTING.md) for how to test by hand.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## Acknowledgements

This project started as a fork of [umeshgiri8/google-calendar-bulk-delete](https://github.com/umeshgiri8/google-calendar-bulk-delete) by Umesh Giri, including a contribution from Bartłomiej Jakub Kwiatek. Thank you both for the original idea and implementation. What changed since is listed in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE). The original copyright notice of Umesh Giri is kept, as the license requires.

This project is not affiliated with or endorsed by Google. Google Calendar is a trademark of Google LLC.
