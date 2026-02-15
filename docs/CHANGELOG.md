# Changelog

## [Unreleased]

### Security
- **Critical:** Fixed privilege escalation vulnerability in `updateUser` by adding strict admin role checks.
- **High:** Implemented status check during login to prevent suspended/inactive users from accessing the system.
- **High:** Enforced ownership checks for deleting comments and photos in engagement actions.
- **High:** Fixed memory leak in rate limiter by implementing periodic cleanup of expired entries.
- **Medium:** Added rate limiting to public home registration (3 attempts/hour).
- **Medium:** Standardized password hashing to use 12 salt rounds across all authentication flows.
- **Low:** Mitigated XSS risk in user management list by replacing raw `<img>` tags with Next.js `Image` component.

### Database
- **Schema:** Added cascade delete relation between `Notification` and `User` to prevent orphaned records.

### Fixes
- **Admin:** Added missing `HOME_ADMIN` role option to the user edit dropdown.
