# Troubleshooting

## Browser console script

**The browser will not let me paste.**
Chrome blocks pasting into the console until you type `allow pasting` and press Enter. Then paste again.

**Nothing happens, or it says it cannot find a button.**
Check that you are on `calendar.google.com` in **Month** view. If Calendar is not in English, set `ADVANCED_MODE` to `true` at the top of the script and enter the labels exactly as Calendar shows them: the **Next month** button, the **Delete event** button, and the repeating-event dialog text.

**The title search works but the description search finds nothing.**
- Raise `popupSettleMs` in the `TIMING` block (for example to `250`), in case descriptions load slowly.
- Make sure `SEARCH_DESCRIPTION` is `true`.
- Open the browser console and look for lines starting with `[WARN`. They say why an event could not be inspected.

**Some events are skipped.**
In Month view, a day with many events shows a "+N more" link, and the hidden events are not seen by the script. Delete the visible ones and run it again, or use the Apps Script version, which has no such limit.

**It stopped partway.**
The page may have changed while it was running, or the tab was in the background. Keep the tab visible and run it again. Events already deleted will not match again.

**It used to work and now does not.**
Google may have changed Calendar's page. Please open an issue and include the console log.

## Apps Script version

**"SEARCH_TEXT is empty".**
Set `SEARCH_TEXT` at the top of the file. It ships empty on purpose so it cannot run by accident.

**"No calendar named ...".**
`CALENDAR_NAME` must match the calendar's name exactly, including capital letters. Leave it empty to use your default calendar.

**Authorization required.**
The first run asks for permission to see and edit your calendars. That is needed to find and delete events.

**It stopped early with a warning.**
It stops before Apps Script's time limit. Run it again to continue.

**"Service invoked too many times" or similar rate-limit errors.**
Wait a few minutes and run it again.

**I deleted the wrong events.**
Google Calendar has a Trash where deleted events can often be restored for a limited time. Check it first, and do not rely on it. Next time, run with `DRY_RUN = true` and read the list before deleting.
