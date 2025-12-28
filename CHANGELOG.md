# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed (LOG-251)

- **BREAKING**: Space deletion now allows organization admins (previously owner-only)
  - SpiceDB permission: `delete = owner + organization->admin`
  - Previously only space owners could delete spaces
  - Now organization admins can also delete spaces within their organization
- Migrated 12 permission checks from inline SQL to SpiceDB
  - 5 organization mutations (update, delete, add_member, remove_member, update_role)
  - 2 space mutations (update, delete)
  - 5 thread mutations (create, update, delete for both space-scoped and org-wide threads)
- Improved fail-closed behavior for authorization errors
  - All SpiceDB errors result in permission denial (deny by default)
  - Enhanced security posture with centralized authorization

### Added (LOG-251)

- Thread permissions support in SpiceDB schema
  - Creator-based permissions for thread ownership
  - Space admin override for space-scoped threads
  - Organization admin override for org-wide threads
- SpiceDB thread relationship synchronization methods
  - `sync_thread_relationships()` - Creates thread authorization relationships
  - `remove_thread_relationships()` - Cleanup on thread deletion
- Comprehensive SpiceDB integration tests (9 test cases)
  - Organization permission hierarchy testing
  - Space permission inheritance testing
  - Thread creator and admin permissions testing
  - Cross-tenant isolation verification
  - Org-wide thread permission testing

### Technical

- Thread permission schema deployed to SpiceDB
  - `thread.delete = creator + space->manage_members + organization->admin`
  - `thread.update = creator + space->owner + organization->admin`
  - `thread.read = space->read + organization->view`
- Automatic relationship cleanup on resource deletion
  - Space deletion removes all space relationships from SpiceDB
  - Thread deletion removes all thread relationships from SpiceDB
- Real SpiceDB integration testing with auto-cleanup fixtures
  - No mocks used (following TESTING.md principles)
  - Parallel-safe test execution via unique resource IDs

## [Previous Releases]

_Previous releases will be documented as versions are tagged._
