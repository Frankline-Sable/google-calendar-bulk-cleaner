'use strict';

/**
 * A small simulation of Google Calendar's month view, used to run the browser
 * console script in jsdom. It models only what the script touches: event chips,
 * the details popup, the delete button, the "delete repeating event" dialog and
 * the "Next month" button, each with a delay so waiting logic is exercised.
 */

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const SCRIPT_PATH = path.join(__dirname, '..', 'src', 'console', 'bulk-delete.js');

// Simulated Calendar latencies in milliseconds
const LATENCY = { popup: 120, description: 60, deleteRemoves: 200, nav: 300 };

function defaultMonths() {
  return [
    [
      { id: 'e1', title: "LSD 120'", desc: 'Distance: 16.00 km\nDuration: 120 min\n[AppSyncId: WKT-S11]' },
      { id: 'e2', title: 'Team lunch', desc: 'Bring snacks' },
      { id: 'e3', title: 'Easy run', desc: '[appsyncid: WKT-S12]' },
      { id: 'e4', title: 'Meeting', desc: '' },
      { id: 'e8', title: 'Weekly sync', desc: '[AppSyncId: R]', recurring: true },
    ],
    [
      { id: 'e5', title: 'Gym', desc: 'APPSYNCID: Z9' },
      { id: 'e6', title: 'Dentist', desc: 'Remember x-rays' },
    ],
    [
      { id: 'e7', title: 'Lsd 90', desc: 'long run [AppSyncId: Q]' },
    ],
  ];
}

/**
 * Runs the console script against the simulated calendar.
 * Resolves with the ids of deleted/opened events and the final alert message.
 */
function runConsoleScript({
  searchText,
  searchDescription = true,
  months = defaultMonths(),
  maxMonths = 3,
  confirmAnswer = true,
  timeoutMs = 60000,
}) {
  return new Promise((resolve) => {
    const dom = new JSDOM(
      '<!doctype html><title>Calendar - Month</title><body>' +
        '<button aria-label="Next month">next</button><div id="grid"></div></body>',
      {
        url: 'https://calendar.google.com/calendar/u/0/r/month',
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        // The script logs a lot; keep test output readable
        virtualConsole: new VirtualConsole(),
      }
    );
    const { window } = dom;
    const doc = window.document;

    // jsdom has no layout engine; treat every attached element as visible
    Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
      get() { return this.parentNode; },
    });

    let month = 0;
    const deleted = [];
    const opened = [];
    let alertMessage = null;
    let finished = false;
    let timer = null;

    const finish = (extra = {}) => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      window.close();
      resolve({ deleted, opened, alertMessage, timedOut: false, ...extra });
    };

    const grid = doc.getElementById('grid');
    const closeDialog = () => { const d = doc.querySelector('[role="dialog"]'); if (d) d.remove(); };

    function render() {
      grid.innerHTML = '';
      closeDialog();
      months[month].forEach((ev) => {
        const chip = doc.createElement('div');
        chip.setAttribute('data-eventchip', '');
        chip.setAttribute('data-eventid', ev.id);
        const span = doc.createElement('span');
        span.textContent = ev.title;
        chip.appendChild(span);

        chip.addEventListener('click', () => {
          closeDialog();
          opened.push(ev.id);
          setTimeout(() => {
            const dialog = doc.createElement('div');
            dialog.setAttribute('role', 'dialog');
            dialog.innerHTML =
              '<span class="t"></span><div class="d"></div>' +
              '<button aria-label="Close">x</button><button aria-label="Delete event">del</button>';
            dialog.querySelector('.t').textContent = ev.title;
            dialog.querySelector('[aria-label="Close"]').addEventListener('click', closeDialog);
            dialog.querySelector('[aria-label="Delete event"]').addEventListener('click', () => {
              const removeEvent = () => {
                deleted.push(ev.id);
                months[month] = months[month].filter((e) => e.id !== ev.id);
                render();
              };
              if (ev.recurring) {
                closeDialog();
                const recurring = doc.createElement('div');
                recurring.innerHTML =
                  '<span class="uW2Fw-k2Wrsb-fmcmS" jsname="MdSI6d">Delete repeating event</span>' +
                  '<button data-mdc-dialog-action="ok">OK</button>';
                recurring.querySelector('button').addEventListener('click', () => {
                  recurring.remove();
                  setTimeout(removeEvent, LATENCY.deleteRemoves);
                });
                doc.body.appendChild(recurring);
              } else {
                setTimeout(removeEvent, LATENCY.deleteRemoves);
              }
            });
            doc.body.appendChild(dialog);
            // The description renders slightly after the popup itself
            setTimeout(() => {
              const d = dialog.querySelector('.d');
              if (d) d.textContent = ev.desc;
            }, LATENCY.description);
          }, LATENCY.popup);
        });
        grid.appendChild(chip);
      });
    }
    render();

    doc.querySelector('[aria-label="Next month"]').addEventListener('click', () => {
      setTimeout(() => { month += 1; render(); }, LATENCY.nav);
    });

    window.prompt = (message) => (/Max months/.test(message) ? String(maxMonths) : searchText);
    window.confirm = () => {
      if (!confirmAnswer) setTimeout(() => finish({ declined: true }), 300);
      return confirmAnswer;
    };
    window.alert = (message) => { alertMessage = message; finish(); };

    let source = fs.readFileSync(SCRIPT_PATH, 'utf8');
    if (!searchDescription) {
      const flagged = source.replace('const SEARCH_DESCRIPTION = true;', 'const SEARCH_DESCRIPTION = false;');
      if (flagged === source) throw new Error('SEARCH_DESCRIPTION flag not found in script');
      source = flagged;
    }

    const startedAt = Date.now();
    timer = setInterval(() => {
      if (Date.now() - startedAt > timeoutMs) finish({ timedOut: true });
    }, 100);

    window.eval(source);
  });
}

module.exports = { runConsoleScript, defaultMonths, LATENCY };
