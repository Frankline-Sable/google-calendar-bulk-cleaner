'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runConsoleScript } = require('../test-utils/calendar-page');

const sorted = (ids) => ids.slice().sort();
const TEST_TIMEOUT = { timeout: 120000 };

describe('console script', () => {
  it('finds events by description, ignoring case, across months and recurring events', TEST_TIMEOUT, async () => {
    const result = await runConsoleScript({ searchText: 'AppSyncId' });
    assert.equal(result.timedOut, false);
    // e1, e3, e5, e7, e8 contain the text in different letter cases; e2, e4, e6 do not
    assert.deepEqual(sorted(result.deleted), ['e1', 'e3', 'e5', 'e7', 'e8']);
    assert.match(result.alertMessage, /Total events deleted: 5/);
  });

  it('matches titles that contain an apostrophe, ignoring case (title-only mode)', TEST_TIMEOUT, async () => {
    const result = await runConsoleScript({ searchText: "lsd 120'", searchDescription: false });
    assert.deepEqual(result.deleted, ['e1']);
    assert.deepEqual(result.opened, ['e1'], 'title-only mode must not open other events');
  });

  it('title-only mode does not look at descriptions', TEST_TIMEOUT, async () => {
    const result = await runConsoleScript({ searchText: 'appsyncid', searchDescription: false });
    assert.deepEqual(result.deleted, []);
    assert.deepEqual(result.opened, []);
  });

  it('deletes a recurring event found by title', TEST_TIMEOUT, async () => {
    const result = await runConsoleScript({ searchText: 'weekly SYNC', searchDescription: false });
    assert.deepEqual(result.deleted, ['e8']);
  });

  it('matches titles case-insensitively in title + description mode', TEST_TIMEOUT, async () => {
    const result = await runConsoleScript({ searchText: 'LSD' });
    assert.deepEqual(sorted(result.deleted), ['e1', 'e7']);
  });

  it('deletes nothing when the search text is empty', TEST_TIMEOUT, async () => {
    const result = await runConsoleScript({ searchText: '   ' });
    assert.deepEqual(result.deleted, []);
    assert.match(result.alertMessage, /cancelled/i);
  });

  it('deletes nothing when the confirmation is declined', TEST_TIMEOUT, async () => {
    const result = await runConsoleScript({ searchText: 'AppSyncId', confirmAnswer: false });
    assert.equal(result.declined, true);
    assert.deepEqual(result.deleted, []);
    assert.deepEqual(result.opened, []);
  });
});
