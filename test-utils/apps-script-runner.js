'use strict';

/**
 * Runs src/apps-script/bulk-delete.gs in a Node vm with a mocked CalendarApp,
 * so the search and delete logic can be tested without a Google account.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SCRIPT_PATH = path.join(__dirname, '..', 'src', 'apps-script', 'bulk-delete.gs');
const DAY_MS = 24 * 60 * 60 * 1000;

/** Builds a fake calendar. Events start `dayOffset` days from now. */
function makeCalendar(name, specs, failIds = []) {
  const events = specs.map((spec) => ({
    ...spec,
    start: new Date(Date.now() + spec.dayOffset * DAY_MS),
    deleted: false,
  }));
  return {
    events,
    getName: () => name,
    getEvents: (from, to) => events
      .filter((e) => !e.deleted && e.start >= from && e.start < to)
      .map((e) => ({
        getTitle: () => e.title,
        getDescription: () => e.desc,
        getStartTime: () => e.start,
        deleteEvent: () => {
          if (failIds.includes(e.id)) throw new Error('rate limited');
          e.deleted = true;
        },
      })),
  };
}

const deletedIds = (calendar) => calendar.events.filter((e) => e.deleted).map((e) => e.id).sort();

function setOption(code, name, literal) {
  // Replace up to the first semicolon so a trailing comment on the line is kept
  const pattern = new RegExp(`^const ${name} = [^;]*;`, 'm');
  if (!pattern.test(code)) throw new Error(`option ${name} not found in script`);
  return code.replace(pattern, `const ${name} = ${literal};`);
}

/**
 * Runs bulkDelete(). Options override the script's top-level constants.
 * Returns { result, error, logs }.
 */
function runBulkDelete({ calendars, searchText, calendarName, dryRun, maxRuntimeMs }) {
  let code = fs.readFileSync(SCRIPT_PATH, 'utf8');
  if (searchText !== undefined) code = setOption(code, 'SEARCH_TEXT', JSON.stringify(searchText));
  if (calendarName !== undefined) code = setOption(code, 'CALENDAR_NAME', JSON.stringify(calendarName));
  if (dryRun !== undefined) code = setOption(code, 'DRY_RUN', String(dryRun));
  if (maxRuntimeMs !== undefined) code = setOption(code, 'MAX_RUNTIME_MS', String(maxRuntimeMs));

  const logs = [];
  const context = {
    CalendarApp: {
      getDefaultCalendar: () => calendars.default,
      getCalendarsByName: (name) => (calendars[name] ? [calendars[name]] : []),
    },
    Utilities: { sleep: () => {} },
    console: {
      log: (m) => logs.push(m),
      warn: (m) => logs.push(`WARN ${m}`),
      error: (m) => logs.push(`ERR ${m}`),
    },
    Date,
    Math,
    String,
  };
  vm.createContext(context);
  vm.runInContext(code, context);

  let result;
  let error;
  try {
    result = vm.runInContext('bulkDelete()', context);
  } catch (e) {
    error = e;
  }
  return { result, error, logs };
}

module.exports = { makeCalendar, runBulkDelete, deletedIds };
