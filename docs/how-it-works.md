# How it works

## Browser console script

Google Calendar's month view only puts event **titles** on the page. An event's description appears only in the details popup that opens when you click the event. So searching descriptions means opening events.

For each month, the script repeats this until nothing is left to delete:

1. **Title search.** It looks through the text on the page for your search text, without regard to case. If it finds an event, it clicks it.
2. **Description search.** If no title matches and `SEARCH_DESCRIPTION` is `true`, it opens each event it has not looked at yet, waits for the popup to appear and stop changing, and reads the popup text. If the text contains your search text, that event is a match. Otherwise the popup is closed and the event is remembered, so it is opened only once per month.
3. **Delete.** It clicks **Delete event** (or **Delete task**). If Calendar asks about a repeating event, it confirms that dialog. It then waits for the event to disappear from the page.
4. **Next month.** When nothing is left, it clicks **Next month**, waits for the page to change, and continues, up to the number of months you entered.

### Waiting instead of fixed pauses

Every step waits for something to be true (the popup exists, its text has settled, the event is gone, the month has changed) and carries on as soon as it is. The `TIMING` block at the top of the script holds the upper limits. If events are skipped or descriptions are missed, raise `popupSettleMs` first.

### What it depends on

The script relies on how Calendar's page is built: event elements carrying `data-eventchip` or `data-eventid`, a details popup with `role="dialog"`, and buttons identified by their English `aria-label`s. Google can change any of these. See [Troubleshooting](troubleshooting.md).

## Apps Script version

Google Apps Script runs inside your Google account and can read and delete your calendar events directly, so no page has to be driven.

1. The date range is split into 30-day windows.
2. For each window it fetches the events from the chosen calendar.
3. An event matches if its title or description contains `SEARCH_TEXT`, without regard to case.
4. With `DRY_RUN = true` it only logs the matches. Otherwise it deletes them one at a time and counts failures. After a failure it pauses briefly in case Google is rate limiting.
5. It stops before Apps Script's six-minute limit and tells you to run it again. Events already deleted no longer match, so repeating the run is safe.

Recurring events appear as individual instances inside each window, and each matching instance is deleted on its own.
