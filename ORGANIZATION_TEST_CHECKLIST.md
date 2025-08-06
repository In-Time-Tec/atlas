# Organization Features Test Checklist

This is a comprehensive manual test checklist for the organization features in Atlas. Since there's no automated test suite configured, use this checklist to verify all organization-related functionality works correctly.

## Prerequisites

- [ ] Have at least 2 test user accounts ready
- [ ] Have valid API keys configured in `.env.local`
- [ ] Database is properly migrated with latest schema
- [ ] Application is running in development mode

## 1. Organization CRUD Operations

### 1.1 Create Organization

- [ ] User can create a new organization from the UI
- [ ] Organization name is required and validated
- [ ] Organization slug is generated automatically or can be customized
- [ ] Slug uniqueness is enforced
- [ ] Organization logo can be uploaded (optional)
- [ ] Metadata can be added (optional)
- [ ] Creator is automatically set as organization owner
- [ ] Organization appears in user's organization list immediately
- [ ] Active organization is switched to newly created org
- [ ] Success toast notification appears

### 1.2 Read/List Organizations

- [ ] User can view list of all organizations they belong to
- [ ] Organization list shows name, slug, and role
- [ ] Active organization is clearly indicated
- [ ] Organization logo displays correctly if present
- [ ] Organization metadata is accessible
- [ ] Organization creation date is shown

### 1.3 Update Organization

- [ ] Owner can edit organization name
- [ ] Owner can edit organization slug (with uniqueness validation)
- [ ] Owner can update organization logo
- [ ] Owner can modify organization metadata
- [ ] Admin can edit organization details
- [ ] Member cannot edit organization details
- [ ] Viewer cannot edit organization details
- [ ] Changes persist after page refresh
- [ ] Update success notification appears

### 1.4 Delete Organization

- [ ] Only owner can delete organization
- [ ] Admin cannot delete organization
- [ ] Delete confirmation dialog appears
- [ ] All organization data is removed (cascade delete)
- [ ] All members lose access
- [ ] Organization is removed from all member lists
- [ ] Active organization switches to personal if deleted org was active

## 2. Member Invitation and Management

### 2.1 Invite Members

- [ ] Owner can invite new members via email
- [ ] Admin can invite new members via email
- [ ] Member cannot invite new members
- [ ] Viewer cannot invite new members
- [ ] Email validation is performed
- [ ] Role can be selected during invitation (member/admin/viewer)
- [ ] Invitation creates a unique token
- [ ] Invitation has expiration date
- [ ] Success notification shows after sending invite
- [ ] Error shown if inviting existing member

### 2.2 Accept Invitation

- [ ] User receives invitation (email or in-app)
- [ ] Invitation link/token works correctly
- [ ] User can accept valid invitation
- [ ] Expired invitations are rejected
- [ ] Already used invitations cannot be reused
- [ ] User is added with correct role upon acceptance
- [ ] Organization appears in user's list after accepting
- [ ] Invitation is marked as accepted in database

### 2.3 View Members

- [ ] All members can view member list
- [ ] Member list shows name, email, role, and join date
- [ ] Current user is highlighted in member list
- [ ] Member count is accurate
- [ ] Pagination works for large member lists
- [ ] Search/filter members functionality works

### 2.4 Update Member Roles

- [ ] Owner can change member roles to admin/member/viewer
- [ ] Owner can transfer ownership to another member
- [ ] Admin can change member roles (except owner)
- [ ] Admin cannot change owner role
- [ ] Member cannot change any roles
- [ ] Viewer cannot change any roles
- [ ] Role changes take effect immediately
- [ ] Role change notification appears

### 2.5 Remove Members

- [ ] Owner can remove any member
- [ ] Admin can remove members (except owner)
- [ ] Admin cannot remove owner
- [ ] Member cannot remove anyone
- [ ] Viewer cannot remove anyone
- [ ] User cannot remove themselves if they're the only owner
- [ ] Removed member loses access immediately
- [ ] Organization disappears from removed member's list

## 3. File Sharing Within Organizations

### 3.1 Upload Files to Organization

- [ ] Member can upload files to organization library
- [ ] Admin can upload files to organization library
- [ ] Owner can upload files to organization library
- [ ] Viewer cannot upload files
- [ ] Files are tagged with organizationId
- [ ] Organization files don't count against personal quota
- [ ] File metadata includes uploader information

### 3.2 View Organization Files

- [ ] All members can view organization files
- [ ] Files are filtered by organizationId
- [ ] Personal files are not visible in organization context
- [ ] Organization files are not visible in personal context
- [ ] File list shows uploader name
- [ ] File permissions are respected

### 3.3 Manage Organization Folders

- [ ] Members can create folders in organization library
- [ ] Folder structure is shared across organization
- [ ] Folders can be nested properly
- [ ] Folder permissions follow organization roles
- [ ] Members can move files between folders

### 3.4 Delete Organization Files

- [ ] Owner can delete any organization file
- [ ] Admin can delete any organization file
- [ ] Member can delete files they uploaded
- [ ] Member cannot delete files uploaded by others
- [ ] Viewer cannot delete any files
- [ ] Deleted files are removed from all members' views

### 3.5 Share Organization Files

- [ ] Organization files can be used in chats
- [ ] File usage is tracked per chat/message
- [ ] Members can generate public links for files (if permitted)
- [ ] Public links respect organization permissions
- [ ] File access is revoked when member is removed

## 4. Organization Billing and Subscriptions

### 4.1 Organization Subscription Creation

- [ ] Owner can subscribe organization to paid plan
- [ ] Subscription details show organization name
- [ ] Seat-based pricing calculates correctly
- [ ] Payment method can be added/updated
- [ ] Subscription confirmation appears

### 4.2 Subscription Management

- [ ] Owner can view subscription details
- [ ] Admin can view subscription details
- [ ] Members can see subscription status
- [ ] Viewers can see subscription status
- [ ] Current period dates are accurate
- [ ] Renewal date is displayed correctly

### 4.3 Seat Management

- [ ] Number of seats matches subscription
- [ ] Cannot add members beyond seat limit
- [ ] Warning appears when approaching seat limit
- [ ] Owner can increase/decrease seats
- [ ] Billing adjusts for seat changes

### 4.4 Subscription Benefits

- [ ] All members get Pro features with org subscription
- [ ] Message limits apply at organization level
- [ ] Extreme search usage counts at org level
- [ ] File storage quota is organization-wide
- [ ] Features unlock for all members immediately

### 4.5 Subscription Cancellation

- [ ] Owner can cancel subscription
- [ ] Admin cannot cancel subscription
- [ ] Cancellation takes effect at period end
- [ ] Members are notified of pending cancellation
- [ ] Features remain until period end
- [ ] Auto-renewal is disabled

### 4.6 Payment History

- [ ] Owner can view payment history
- [ ] Admin can view payment history
- [ ] Invoices are accessible
- [ ] Payment methods are shown
- [ ] Failed payments are logged

## 5. Permission Checks

### 5.1 Owner Permissions

- [ ] Can perform all organization operations
- [ ] Can delete organization
- [ ] Can transfer ownership
- [ ] Can manage billing
- [ ] Can remove any member
- [ ] Can change any member's role
- [ ] Can access all organization resources

### 5.2 Admin Permissions

- [ ] Can edit organization details
- [ ] Cannot delete organization
- [ ] Can invite new members
- [ ] Can remove members (except owner)
- [ ] Can change member roles (except owner)
- [ ] Can manage organization files
- [ ] Can view billing (but not modify)

### 5.3 Member Permissions

- [ ] Can view organization details
- [ ] Cannot edit organization details
- [ ] Cannot invite new members
- [ ] Cannot remove members
- [ ] Cannot change roles
- [ ] Can upload/manage own files
- [ ] Can use organization resources

### 5.4 Viewer Permissions

- [ ] Can only view organization details
- [ ] Cannot upload files
- [ ] Cannot modify anything
- [ ] Can view organization files
- [ ] Can use files in chats (read-only)
- [ ] Cannot invite or manage members

## 6. Organization Context Switching

### 6.1 Switch Active Organization

- [ ] User can switch between organizations
- [ ] Active organization persists across sessions
- [ ] UI updates to show active organization
- [ ] Resources filter by active organization
- [ ] Personal workspace option is available
- [ ] Switch is smooth without page reload

### 6.2 Data Isolation

- [ ] Chats are filtered by active organization
- [ ] Messages respect organization context
- [ ] Files are properly isolated
- [ ] Custom instructions are org-specific
- [ ] Usage metrics are separated
- [ ] Tasks are organization-scoped

### 6.3 Cache Invalidation

- [ ] Organization switch clears relevant caches
- [ ] Fresh data loads for new organization
- [ ] No data leakage between organizations
- [ ] User data refreshes properly
- [ ] File lists update correctly

## 7. Edge Cases and Error Handling

### 7.1 Concurrent Operations

- [ ] Multiple users can edit organization simultaneously
- [ ] Race conditions are handled properly
- [ ] Optimistic updates work correctly
- [ ] Conflicts are resolved appropriately

### 7.2 Network Failures

- [ ] Operations retry on network failure
- [ ] Error messages are user-friendly
- [ ] Partial updates don't corrupt data
- [ ] Offline mode degrades gracefully

### 7.3 Data Validation

- [ ] Invalid organization names are rejected
- [ ] Duplicate slugs are prevented
- [ ] Email validation for invitations
- [ ] Role changes validate permissions
- [ ] File uploads validate organization context

### 7.4 Limits and Quotas

- [ ] Organization member limit is enforced
- [ ] File storage quota is tracked
- [ ] API rate limits are respected
- [ ] Seat limits prevent over-invitation
- [ ] Usage limits apply correctly

## 8. Security Tests

### 8.1 Authentication

- [ ] Unauthenticated users cannot access org endpoints
- [ ] Session validation occurs on each request
- [ ] Token expiration is handled properly

### 8.2 Authorization

- [ ] Users cannot access organizations they don't belong to
- [ ] Role-based access control is enforced
- [ ] Direct API calls respect permissions
- [ ] URL manipulation doesn't bypass security

### 8.3 Data Protection

- [ ] Organization data is properly isolated
- [ ] Deleted organizations remove all data
- [ ] Invitation tokens are secure and unique
- [ ] File access requires organization membership

## Test Execution Notes

### Priority Levels

- **P0 (Critical)**: Organization CRUD, Member invitation, Permission checks
- **P1 (High)**: File sharing, Subscription management, Context switching
- **P2 (Medium)**: Edge cases, Error handling, UI/UX polish
- **P3 (Low)**: Performance optimizations, Minor UI issues

### Test Environment Setup

1. Create test organizations with different configurations
2. Set up users with various roles
3. Upload test files of different types and sizes
4. Configure test subscriptions if testing billing

### Known Issues to Watch For

- Check for console errors during operations
- Monitor network requests for failures
- Verify database consistency after operations
- Test with slow network conditions
- Check mobile responsiveness

### Regression Testing

After any organization-related code changes:

1. Run through P0 and P1 test cases
2. Test affected areas thoroughly
3. Verify no existing functionality breaks
4. Check for performance regressions

## Test Results Tracking

Create a test run record with:

- Date and time of test execution
- Version/commit being tested
- Tester name
- Failed test cases with descriptions
- Screenshots of issues
- Steps to reproduce failures
- Environment details (browser, OS, etc.)

---

**Last Updated**: Current as of initial creation
**Test Coverage**: Manual testing only (no automated tests configured)
**Recommendation**: Consider implementing automated tests for critical paths using appropriate testing frameworks.
