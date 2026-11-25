/**
 * google-calendar-bulk-cleaner: Google Apps Script version
 *
 * Bulk delete Google Calendar events whose TITLE or DESCRIPTION contains
 * SEARCH_TEXT (not case sensitive). Runs inside your Google account, so it
 * does not open any event popups and is much faster than the console script.
 *
 * How to use:
 *   1. Go to https://script.google.com and create a new project.
 *   2. Paste this file in, set the options below, and save.
 *   3. Run `bulkDelete` once with DRY_RUN = true and read the execution log.
 *   4. If the list is right, set DRY_RUN = false and run it again.
 *
 * Recurring events: matching instances are deleted one at a time, so only the
 * instances that fall inside the date range are removed, not the whole series.
 *
 * License: MIT
 */

/* exported bulkDelete */

// ---- Options -------------------------------------------------------------
// Text to look for in event titles and descriptions. Required.
const SEARCH_TEXT = '';

// Name of the calendar to clean. Leave '' to use your default calendar.
const CALENDAR_NAME = '';

// Date range to search. Defaults to one year back and one year ahead.
const START_DATE = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
const END_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

// true = only list what would be deleted. Set to false to really delete.
const DRY_RUN = true;
// --------------------------------------------------------------------------

const WINDOW_DAYS = 30;          // events are fetched in windows of this size
const MAX_RUNTIME_MS = 5 * 60 * 1000; // stop before Apps Script's 6 minute limit

function bulkDelete() {
  const needle = String(SEARCH_TEXT).trim().toLowerCase();
  if (!needle) {
    throw new Error('SEARCH_TEXT is empty');
  }

  const calendar = getCalendar_();
  const startedAt = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let scanned = 0;
  let matched = 0;
  let deleted = 0;
  let failed = 0;
  let timedOut = false;

  for (let from = new Date(START_DATE.getTime()); from < END_DATE; from = new Date(from.getTime() + WINDOW_DAYS * dayMs)) {
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      timedOut = true;
      break;
    }

    const to = new Date(Math.min(from.getTime() + WINDOW_DAYS * dayMs, END_DATE.getTime()));
    const events = calendar.getEvents(from, to);
    scanned += events.length;

    for (const event of events) {
      if (!eventMatches_(event, needle)) {
        continue;
      }
      matched++;
      const label = event.getTitle() + ' (' + event.getStartTime() + ')';

      if (DRY_RUN) {
        console.log('[dry run] would delete: ' + label);
        continue;
      }

      try {
        event.deleteEvent();
        deleted++;
      } catch (error) {
        failed++;
        console.error('Could not delete ' + label + ': ' + error);
        Utilities.sleep(1000); // back off if Google is rate limiting
      }
    }
  }

  const summary = 'Scanned ' + scanned + ' events in "' + calendar.getName() + '". ' +
    'Matched ' + matched + (DRY_RUN ? ' (dry run, nothing deleted).' : ', deleted ' + deleted + ', failed ' + failed + '.');
  console.log(summary);
  if (timedOut) {
    console.warn('Stopped early to stay under the time limit. Run bulkDelete again to continue; ' +
      'events already deleted will not match again.');
  }
  return summary;
}

function getCalendar_() {
  if (!CALENDAR_NAME) {
    return CalendarApp.getDefaultCalendar();
  }
  const calendars = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (calendars.length === 0) {
    throw new Error('No calendar named "' + CALENDAR_NAME + '" was found');
  }
  return calendars[0];
}

function eventMatches_(event, needle) {
  const title = (event.getTitle() || '').toLowerCase();
  const description = (event.getDescription() || '').toLowerCase();
  return title.includes(needle) || description.includes(needle);
}
