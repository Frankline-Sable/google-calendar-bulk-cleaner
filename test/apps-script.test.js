'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { makeCalendar, runBulkDelete, deletedIds } = require('../test-utils/apps-script-runner');

const specs = () => [
  { id: 'a', title: "LSD 120'", desc: 'Distance: 16 km\n[AppSyncId: WKT-S11]', dayOffset: -10 },
  { id: 'b', title: 'Easy run', desc: '[appsyncid: WKT-S12]', dayOffset: 5 }, // lowercase description match
  { id: 'c', title: 'AppSyncId test', desc: '', dayOffset: 40 }, // title match
  { id: 'd', title: 'Lunch', desc: 'nothing here', dayOffset: 3 }, // no match
  { id: 'e', title: 'Old', desc: '[AppSyncId: old]', dayOffset: -500 }, // outside the date range
  { id: 'f', title: 'No description', desc: null, dayOffset: 8 }, // null description must not crash
  { id: 'g', title: 'Rate limited', desc: 'AppSyncId', dayOffset: 20 },
];

describe('apps script version', () => {
  it('dry run lists matches and deletes nothing', () => {
    const calendar = makeCalendar('Work', specs());
    const { result, error, logs } = runBulkDelete({
      calendars: { Work: calendar }, searchText: 'AppSyncId', calendarName: 'Work', dryRun: true,
    });
    assert.equal(error, undefined);
    assert.deepEqual(deletedIds(calendar), []);
    assert.equal(logs.filter((l) => l.startsWith('[dry run]')).length, 4);
    assert.match(result, /Matched 4 \(dry run, nothing deleted\)/);
  });

  it('deletes matches by title or description, ignoring case, inside the date range only', () => {
    const calendar = makeCalendar('Work', specs());
    const { error } = runBulkDelete({
      calendars: { Work: calendar }, searchText: 'AppSyncId', calendarName: 'Work', dryRun: false,
    });
    assert.equal(error, undefined);
    assert.deepEqual(deletedIds(calendar), ['a', 'b', 'c', 'g']);
  });

  it('keeps going when one delete fails and reports it', () => {
    const calendar = makeCalendar('Work', specs(), ['b']);
    const { result } = runBulkDelete({
      calendars: { Work: calendar }, searchText: 'AppSyncId', calendarName: 'Work', dryRun: false,
    });
    assert.deepEqual(deletedIds(calendar), ['a', 'c', 'g']);
    assert.match(result, /deleted 3, failed 1/);
  });

  it('uses the default calendar when no name is given and matches titles', () => {
    const calendar = makeCalendar('Default', specs());
    const { error } = runBulkDelete({
      calendars: { default: calendar }, searchText: 'lsd', calendarName: '', dryRun: false,
    });
    assert.equal(error, undefined);
    assert.deepEqual(deletedIds(calendar), ['a']);
  });

  it('throws when the named calendar does not exist', () => {
    const { error } = runBulkDelete({ calendars: {}, searchText: 'x', calendarName: 'Missing' });
    assert.match(error.message, /No calendar named "Missing"/);
  });

  it('throws when the search text is empty', () => {
    const calendar = makeCalendar('Work', specs());
    const { error } = runBulkDelete({
      calendars: { Work: calendar }, searchText: '  ', calendarName: 'Work', dryRun: false,
    });
    assert.match(error.message, /SEARCH_TEXT is empty/);
    assert.deepEqual(deletedIds(calendar), []);
  });

  it('ships with safe defaults: unchanged, it refuses to run and deletes nothing', () => {
    const calendar = makeCalendar('Default', specs());
    const { error } = runBulkDelete({ calendars: { default: calendar } });
    assert.match(error.message, /SEARCH_TEXT is empty/);
    assert.deepEqual(deletedIds(calendar), []);
  });

  it('stops early when the time limit is reached', () => {
    const calendar = makeCalendar('Work', specs());
    const { logs } = runBulkDelete({
      calendars: { Work: calendar }, searchText: 'AppSyncId', calendarName: 'Work', dryRun: false, maxRuntimeMs: -1,
    });
    assert.ok(logs.some((l) => l.startsWith('WARN Stopped early')));
    assert.deepEqual(deletedIds(calendar), []);
  });
});
