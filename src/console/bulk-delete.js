/**
 * google-calendar-bulk-cleaner: browser console script
 *
 * Deletes every Google Calendar event whose title or description contains the
 * text you enter (not case sensitive).
 *
 * Usage: open Google Calendar in Month view, open the browser console, paste
 * this whole file and press Enter. See README.md for details.
 *
 * Based on google-calendar-bulk-delete by Umesh Giri (MIT License):
 * https://github.com/umeshgiri8/google-calendar-bulk-delete
 *
 * License: MIT
 */
(() => {
  // Set to true to be asked for the Calendar button labels. Needed when Google
  // Calendar is not shown in English (the defaults below are the English labels).
  const ADVANCED_MODE = false;

  // When true, events whose title does not match are also opened so their
  // description (and location) can be searched. Slower, because every
  // event on the page has to be opened once. Set to false for title-only.
  const SEARCH_DESCRIPTION = true;

  // Timing knobs (milliseconds). The script moves on as soon as the page is
  // ready, so these are mostly upper limits. If events get skipped or the
  // description search misses matches, raise popupSettleMs first.
  const TIMING = {
    pollMs: 25,            // how often the page is checked while waiting
    popupSettleMs: 100,    // popup text must stay unchanged this long before it is read
    afterDeleteMs: 300,    // max wait for the "delete repeating event" dialog
    betweenEventsMs: 100,  // pause before looking for the next match
    navigationMinMs: 400,  // minimum wait after clicking "Next month"
    navigationMaxMs: 2500  // give up waiting for the new month after this long
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Polls until predicate() is truthy or the timeout passes. Resolves true/false.
  const waitFor = async (predicate, timeout, interval = TIMING.pollMs) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (predicate()) {
        return true;
      }
      await sleep(interval);
    }
    return Boolean(predicate());
  };

  const waitForGone = (selector, timeout = 1000) =>
    waitFor(() => !document.querySelector(selector), timeout);

  const waitForDetached = (element, timeout = 2000) =>
    waitFor(() => !element.isConnected, timeout);

  // Returns the element's text once it has stopped changing for settleMs
  const waitForStableText = async (element, settleMs, maxMs) => {
    const start = Date.now();
    let last = element.textContent;
    let lastChange = Date.now();
    while (Date.now() - start < maxMs) {
      await sleep(TIMING.pollMs);
      const current = element.textContent;
      if (current !== last) {
        last = current;
        lastChange = Date.now();
      } else if (Date.now() - lastChange >= settleMs) {
        break;
      }
    }
    return element.textContent || '';
  };

  // Enhanced logging utility
  const logger = {
    info: (message, data = null) => {
      const timestamp = new Date().toISOString();
      console.log(`[INFO ${timestamp}] ${message}`, data || '');
    },
    warn: (message, data = null) => {
      const timestamp = new Date().toISOString();
      console.warn(`[WARN ${timestamp}] ${message}`, data || '');
    },
    error: (message, error = null) => {
      const timestamp = new Date().toISOString();
      console.error(`[ERROR ${timestamp}] ${message}`, error || '');
    },
    success: (message, data = null) => {
      const timestamp = new Date().toISOString();
      console.log(`[SUCCESS ${timestamp}] ${message}`, data || '');
    }
  };

  const getAndValidateInput = (key, message, defaultValue, advancedMode) => {
    if ( advancedMode !== true ) {
      return defaultValue;
    }
    const result = prompt(message, defaultValue);
    
      if (!result) {
        logger.warn('User cancelled input dialog or provided null value');
        alert(`No value for ${key} provided. Operation cancelled.`);
        return null;
      }
      
      if (result.trim() === '') {
        logger.warn('User provided empty string after trimming');
        alert(`Value for ${key} cannot be empty. Operation cancelled.`);
        return null;
      }
      
      const trimmedSearch = result.trim();
      logger.info(`Value for ${key} collected`, {string: trimmedSearch, length: trimmedSearch.length});

      return trimmedSearch;
  }

  const reoccurringDialogSelector = 'span.uW2Fw-k2Wrsb-fmcmS[jsname="MdSI6d"]';
  const reoccurringDialogOkButtonSelector = '[data-mdc-dialog-action="ok"]';

  let nextPageLabel, deleteEventButtonLabel, deleteTaskButtonLabel, deleteReoccurringEventLabel,
    deleteReoccurringTaskLabel, maxPages;

  // Function to get user input and confirmation with enhanced validation
  const getUserInput = () => {
    logger.info('Starting user input collection');

    try {
      nextPageLabel = getAndValidateInput('nextPageLabel', "Next page label", 'Next month', ADVANCED_MODE);
      deleteEventButtonLabel = getAndValidateInput('deleteEventButtonLabel', "Delete event label", 'Delete event', ADVANCED_MODE);
      deleteTaskButtonLabel = getAndValidateInput('deleteTaskButtonLabel', "Delete task label", 'Delete task', ADVANCED_MODE);
      deleteReoccurringEventLabel = getAndValidateInput('deleteReoccurringEventLabel', "Delete reoccurring event label", 'Delete repeating event', ADVANCED_MODE);
      deleteReoccurringTaskLabel = getAndValidateInput('deleteReoccurringTaskLabel', "Delete reoccurring task label", 'Delete recurring task', ADVANCED_MODE);
      maxPages = getAndValidateInput('maxPages', "Max months to process", 12, true);
      const trimmedSearch = getAndValidateInput(
        'trimmedSearch',
        SEARCH_DESCRIPTION
          ? "Enter the text to search for in event titles AND descriptions (not case sensitive)"
          : "Enter the text to search for in event titles (not case sensitive)",
        "",
        true
      );
      if (!trimmedSearch) {
        return null;
      }
      const scope = SEARCH_DESCRIPTION ? "title or description" : "title";
      const confirmation = confirm(
        `Are you sure you want to delete ALL events whose ${scope} contains "${trimmedSearch}"?\n\n` +
        "This action cannot be undone. The script will:\n" +
        `1. Search through up to ${maxPages} pages of your calendar\n` +
        "2. Delete every event that contains this text (not case sensitive)\n" +
        "3. Continue until all matching events are removed\n\n" +
        "Click OK to proceed or Cancel to abort."
      );
      
      if (!confirmation) {
        logger.info('User declined confirmation dialog');
        return null;
      }
      
      logger.success('User input validated and confirmed', { searchString: trimmedSearch });
      return trimmedSearch;
      
    } catch (error) {
      logger.error('Error during user input collection', error);
      alert('An error occurred while collecting input. Please try again.');
      return null;
    }
  };
  
  // Enhanced element selection with retry logic
  const waitForElement = (selector, timeout = 5000, retryInterval = TIMING.pollMs) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        try {
          const element = document.querySelector(selector);
          if (element) {
            logger.info('Element found', { selector, timeWaited: Date.now() - startTime });
            resolve(element);
            return;
          }
          
          if (Date.now() - startTime >= timeout) {
            logger.warn('Element not found within timeout', { selector, timeout });
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            return;
          }
          
          setTimeout(checkElement, retryInterval);
        } catch (error) {
          logger.error('Error while waiting for element', { selector, error });
          reject(error);
        }
      };
      
      checkElement();
    });
  };
  
  // Case-insensitive title search. Plain JS instead of XPath, so quotes in the
  // search text (e.g. LSD 120') cannot break the query.
  const findMatchingEvents = (searchString) => {
    try {
      logger.info('Searching for matching events', { searchString });

      const needle = searchString.trim().toLowerCase();
      const matches = Array.from(document.querySelectorAll('span')).filter(span => {
        if (span.closest('[role="dialog"]')) {
          return false; // ignore text inside an open event popup
        }
        const ownText = Array.from(span.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join('');
        return ownText.toLowerCase().includes(needle);
      });

      logger.info('Title search completed', { matchCount: matches.length, searchString });
      return matches;
    } catch (error) {
      logger.error('Error during title search', { searchString, error });
      throw new Error(`Failed to search for events: ${error.message}`);
    }
  };

  // Event chips currently visible on the page (used for the description search)
  const getEventChips = () => {
    let chips = Array.from(document.querySelectorAll('[data-eventchip]'));
    if (chips.length === 0) {
      chips = Array.from(document.querySelectorAll('[data-eventid]'));
    }
    return chips.filter(chip => chip.offsetParent !== null);
  };

  // Stable key for a chip so each event is opened only once per page
  const chipKey = (chip) => {
    const id = chip.getAttribute('data-eventid');
    if (id) {
      return id;
    }
    const rect = chip.getBoundingClientRect();
    return `${chip.textContent}@${Math.round(rect.left)},${Math.round(rect.top)}`;
  };

  const closeEventPopup = async () => {
    const closeButton = document.querySelector('[role="dialog"] button[aria-label="Close"]');
    if (closeButton) {
      closeButton.click();
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true
      }));
    }
    await waitForGone('[role="dialog"]', 800);
  };

  const isRecurringDialogShown = () => {
    const dialog = document.querySelector(reoccurringDialogSelector);
    return Boolean(dialog &&
      (dialog.textContent.includes(deleteReoccurringEventLabel) ||
       dialog.textContent.includes(deleteReoccurringTaskLabel)));
  };

  // Signature of what the calendar is showing, used to notice that a new month has loaded
  const pageSignature = () =>
    document.title + '|' + getEventChips().map(chipKey).join(',');

  // Clicks Delete in the already-open event popup and confirms the recurring dialog if shown.
  // `target` is the element that disappears once the event is gone.
  const confirmDeleteOpenEvent = async (eventText, target = null) => {
    const deleteButton = await waitForElement(
      'button[aria-label="' + deleteEventButtonLabel + '"], button[aria-label="' + deleteTaskButtonLabel + '"]',
      3000
    );

    deleteButton.click();
    logger.info('Delete button clicked, checking for recurring event dialog');

    try {
      // Stop waiting as soon as the recurring dialog appears or the event vanishes
      await waitFor(
        () => isRecurringDialogShown() || (target !== null && !target.isConnected),
        TIMING.afterDeleteMs
      );

      if (isRecurringDialogShown()) {
        logger.info('Recurring event dialog detected');

        const okButton = await waitForElement(reoccurringDialogOkButtonSelector, 2000);
        okButton.click();
        await waitForGone(reoccurringDialogSelector, 1500);

        logger.success('Recurring event deleted', { eventText });
      } else {
        logger.success('Regular event deleted', { eventText });
      }

      // Let the calendar finish removing the event before the page is scanned again
      if (target !== null) {
        await waitForDetached(target, 2000);
      }
    } catch (dialogError) {
      logger.error('Error handling deletion dialog', { eventText, error: dialogError });
      // Still consider it a success if we got this far
    }
    return true;
  };

  // Enhanced event deletion with comprehensive error handling
  const deleteEvent = async (eventElement, eventIndex, totalFound) => {
    try {
      const eventText = eventElement.textContent || 'Unknown event';
      logger.info('Attempting to delete event', {
        eventIndex: eventIndex + 1,
        totalFound,
        eventText: eventText.substring(0, 100) + (eventText.length > 100 ? '...' : '')
      });

      // Click the event
      eventElement.click();
      logger.info('Event clicked, waiting for delete button');

      return await confirmDeleteOpenEvent(eventText, eventElement);

    } catch (error) {
      logger.error('Error deleting event', {
        eventIndex: eventIndex + 1,
        eventText: eventElement?.textContent || 'Unknown',
        error
      });
      throw error;
    }
  };

  // Opens each not-yet-inspected event on the page, reads its popup (which holds
  // the description), and deletes the first one that matches. Returns true if
  // an event was deleted, false if none on this page matched.
  const deleteFirstDescriptionMatch = async (searchString, inspected) => {
    const needle = searchString.trim().toLowerCase();
    const chips = getEventChips().filter(chip => !inspected.has(chipKey(chip)));

    logger.info('Searching event descriptions', { toInspect: chips.length });

    for (const chip of chips) {
      const key = chipKey(chip);
      inspected.add(key);
      const eventText = chip.textContent || 'Unknown event';

      try {
        chip.click();
        const popup = await waitForElement('[role="dialog"]', 3000);
        // read the popup once its text has stopped changing (description rendered)
        const popupText = (await waitForStableText(popup, TIMING.popupSettleMs, 800)).toLowerCase();

        if (popupText.includes(needle)) {
          logger.info('Description match found', {
            eventText: eventText.substring(0, 100)
          });
          await confirmDeleteOpenEvent(eventText, chip);
          return true;
        }

        await closeEventPopup();
      } catch (error) {
        logger.warn('Could not inspect event, skipping', { eventText: eventText.substring(0, 100), error });
        await closeEventPopup();
      }
    }

    return false;
  };
  
  // Enhanced page navigation with error handling
  const navigateToNextPage = async (currentPage) => {
    try {
      logger.info('Navigating to next page', { currentPage, nextPage: currentPage + 1 });
      
      const nextButton = await waitForElement('button[aria-label="' + nextPageLabel + '"]', 3000);
      const before = pageSignature();
      nextButton.click();

      logger.info('Next button clicked, waiting for page load');

      // Wait until the calendar shows something different (new month title or events).
      // An empty month after an empty month looks identical, so the max wait still applies.
      await sleep(TIMING.navigationMinMs);
      await waitFor(
        () => pageSignature() !== before,
        TIMING.navigationMaxMs - TIMING.navigationMinMs
      );

      logger.success('Navigation completed', { newPage: currentPage + 1 });
      return true;
    } catch (error) {
      logger.error('Error navigating to next page', { currentPage, error });
      return false;
    }
  };
  
  // Main deletion process with comprehensive error handling
  const processCalendarDeletion = async (searchString) => {
    let currentPage = 1;
    let totalDeleted = 0;
    let totalErrors = 0;
    const errors = [];
    let inspected = new Set(); // events already opened on the current page

    logger.info('Starting calendar deletion process', { 
      searchString, 
      maxPages, 
      startTime: new Date().toISOString() 
    });
    
    const processPage = async () => {
      try {
        if (currentPage > maxPages) {
          logger.success('All pages processed', { 
            totalPages: maxPages, 
            totalDeleted, 
            totalErrors,
            completionTime: new Date().toISOString()
          });
          
          let message = `Deletion complete!\nTotal events deleted: ${totalDeleted}`;
          if (totalErrors > 0) {
            message += `\nErrors encountered: ${totalErrors} (check console for details)`;
          }
          alert(message);
          return;
        }
        
        logger.info('Processing page', { currentPage, maxPages });
        
        // Find matching events on current page
        const matchingSpans = findMatchingEvents(searchString);
        const matchCount = matchingSpans.length;
        
        if (matchCount > 0) {
          logger.info('Found matching events on page', { currentPage, matchCount });
          
          // Process first event (we'll loop back to get the rest)
          try {
            const firstMatch = matchingSpans[0];
            await deleteEvent(firstMatch, 0, matchCount);
            totalDeleted++;
            
            logger.success('Event deleted successfully', { 
              currentPage, 
              totalDeleted, 
              remainingOnPage: matchCount - 1 
            });
            
            // Continue processing the same page after a short delay
            setTimeout(() => processPage(), TIMING.betweenEventsMs);
            
          } catch (deleteError) {
            totalErrors++;
            errors.push({
              page: currentPage,
              error: deleteError.message,
              timestamp: new Date().toISOString()
            });
            
            logger.error('Failed to delete event, continuing', { 
              currentPage, 
              totalErrors, 
              error: deleteError 
            });
            
            // Continue anyway after a longer delay
            setTimeout(() => processPage(), 1500);
          }
          
        } else {
          logger.info('No title matches on page', { currentPage });

          // Title did not match anything: look inside the event descriptions
          if (SEARCH_DESCRIPTION) {
            const deletedByDescription = await deleteFirstDescriptionMatch(searchString, inspected);
            if (deletedByDescription) {
              totalDeleted++;
              logger.success('Event deleted via description match', { currentPage, totalDeleted });
              setTimeout(() => processPage(), TIMING.betweenEventsMs);
              return;
            }
          }

          logger.info('No matching events left on page', { currentPage });

          // Move to next page
          if (currentPage < maxPages) {
            const navigationSuccess = await navigateToNextPage(currentPage);

            if (navigationSuccess) {
              currentPage++;
              inspected = new Set();
              setTimeout(() => processPage(), TIMING.betweenEventsMs);
            } else {
              logger.error('Failed to navigate to next page, ending process', { currentPage });
              alert(`Process stopped due to navigation error on page ${currentPage}.\nTotal events deleted: ${totalDeleted}`);
            }
          } else {
            logger.success('Reached maximum pages', { maxPages, totalDeleted, totalErrors });
            
            let message = `Process complete! Processed ${maxPages} pages.\nTotal events deleted: ${totalDeleted}`;
            if (totalErrors > 0) {
              message += `\nErrors encountered: ${totalErrors} (check console for details)`;
            }
            alert(message);
          }
        }
        
      } catch (pageError) {
        totalErrors++;
        errors.push({
          page: currentPage,
          error: pageError.message,
          timestamp: new Date().toISOString()
        });
        
        logger.error('Error processing page', { currentPage, error: pageError });
        
        // Try to continue with next page
        if (currentPage < maxPages) {
          logger.warn('Attempting to continue with next page after error');
          try {
            const navigationSuccess = await navigateToNextPage(currentPage);
            if (navigationSuccess) {
              currentPage++;
              inspected = new Set();
              setTimeout(() => processPage(), 3000);
            } else {
              logger.error('Cannot continue - navigation failed');
              alert(`Process stopped due to critical error on page ${currentPage}.\nTotal events deleted: ${totalDeleted}\nCheck console for error details.`);
            }
          } catch (navError) {
            logger.error('Critical error - cannot continue', navError);
            alert(`Critical error occurred. Process stopped.\nTotal events deleted: ${totalDeleted}\nCheck console for details.`);
          }
        } else {
          logger.error('Error on final page, ending process', { totalDeleted, totalErrors });
          alert(`Process completed with errors.\nTotal events deleted: ${totalDeleted}\nErrors: ${totalErrors}\nCheck console for details.`);
        }
      }
    };
    
    // Start processing
    await processPage();
  };
  
  // Main execution with top-level error handling
  const main = async () => {
    try {
      logger.info('Calendar deletion script started');
      
      // Check if we're on a calendar page
      if (!window.location.hostname.includes('calendar.google.com')) {
        const warning = 'This script is designed for Google Calendar. Current page may not be supported.';
        logger.warn(warning);
        if (!confirm(warning + '\n\nDo you want to continue anyway?')) {
          logger.info('User chose not to continue on non-calendar page');
          return;
        }
      }
      
      // Get user input
      const searchString = getUserInput();
      if (!searchString) {
        logger.info('Operation cancelled by user during input phase');
        return;
      }
      
      // Start the deletion process
      await processCalendarDeletion(searchString);
      
    } catch (error) {
      logger.error('Critical error in main execution', error);
      alert('A critical error occurred. Check the browser console for details.');
    }
  };
  
  // Execute the script
  main();
})();
