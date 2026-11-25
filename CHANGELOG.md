# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-11-25

First release as an independent project. It started as a fork of
[umeshgiri8/google-calendar-bulk-delete](https://github.com/umeshgiri8/google-calendar-bulk-delete)
at commit `93c921f` (see the README for credits).

### Added
- Search event **descriptions** as well as titles. Events that do not match by
  title are opened once and the details popup is searched.
- **Case-insensitive** matching for both title and description.
- `src/apps-script/bulk-delete.gs`: a Google Apps Script version that searches a
  calendar over a date range on Google's side. It has a dry-run mode (on by
  default), reports failures, and stops before Apps Script's time limit.
- `SEARCH_DESCRIPTION` switch in the console script for a fast title-only mode.
- `TIMING` settings block in the console script.
- Automated tests (`npm test`), ESLint (`npm run lint`) and a GitHub Actions
  workflow.
- Documentation: README, how it works, troubleshooting, contributing guide.

### Changed
- The console script now waits for the page (popup rendered, popup closed, event
  removed, new month loaded) instead of using long fixed pauses.
- The search text is trimmed, and empty input cancels cleanly.
- Project layout: scripts moved to `src/console/` and `src/apps-script/`.

### Fixed
- Titles containing an apostrophe (for example `LSD 120'`) could break the
  title search, because the text was placed inside an XPath expression.

[Unreleased]: https://github.com/Frankline-Sable/google-calendar-bulk-cleaner/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Frankline-Sable/google-calendar-bulk-cleaner/releases/tag/v1.0.0
