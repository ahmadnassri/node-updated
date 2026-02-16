# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **GitHub Action Support**: `updated` can now run as a GitHub Action for automated dependency checking and updates
  - Report mode with annotations for outdated/deprecated packages
  - Auto-update mode with PR creation
  - Direct commit support for automated updates
  - PR comment feature for dependency reports
  - Full monorepo/workspace support
  - Docker image version checking in compose files
- New `action.js` entry point for GitHub Actions runtime
- New `action.yml` metadata file defining action inputs and outputs
- PRCreator class for automated PR creation via GitHub API
- Commenter class for posting dependency reports as PR comments
- GitHub workflow (`test-action.yml`) for testing the action
- Comprehensive action documentation in `docs/action-guide.md`
- Action usage examples in README.md

### Changed

- **Architecture Refactoring**: Extracted core business logic into reusable Engine class
  - Created unified Config class for both CLI and Action
  - Introduced Input/Output interface abstractions
  - CLI and Action now share 100% of dependency checking logic
  - Improved testability and maintainability
- Simplified `index.js` from 288 lines to 61 lines
- Moved interactive/selection modules to `lib/interfaces/cli/`
- Added ecosystem `update()` methods for npm and Docker

### Fixed

- Import paths updated after moving interactive/selection files
- All 93 tests passing after refactoring

### Dependencies

- Added `@actions/core@^1.11.1` for GitHub Actions toolkit
- Added `@actions/github@^6.0.0` for GitHub API integration
- Added `esbuild@^0.24.2` as dev dependency for action bundling

## [4.0.0] - Previous Release

- Interactive mode for dependency selection
- Docker compose file support
- Workspace/monorepo support
- Bun-native implementation

---

[Unreleased]: https://github.com/ahmadnassri/node-updated/compare/v4.0.0...HEAD
[4.0.0]: https://github.com/ahmadnassri/node-updated/releases/tag/v4.0.0
