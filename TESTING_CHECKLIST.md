# Volunteer Management System - E2E Testing Checklist

## How to Run Manual Tests

1. Start the development server: `npm run dev`
2. Open browser to: `http://localhost:3000`
3. Follow each test scenario below

---

## Test Session 1: Admin Creates Invitation

### 1.1 Admin creates VOLUNTEER invitation
- [ ] Login as ADMIN (email: admin@test.com, password: admin123)
- [ ] Navigate to `/admin/invitations`
- [ ] Click "Create New Invitation"
- [ ] Enter: email = volunteer-new@test.com
- [ ] Select role = VOLUNTEER
- [ ] Click "Send Invitation"
- [ ] **Expected**: Invitation created, email sent, appears in list

### 1.2 Admin creates FACILITATOR invitation
- [ ] Navigate to `/admin/invitations`
- [ ] Create invitation: email = facilitator@test.com, role = FACILITATOR
- [ ] **Expected**: Invitation created successfully.

### 1.3 Admin creates HOME_ADMIN invitation
- [ ] Navigate to `/admin/invitations`
- [ ] Create invitation: email = homeadmin@test.com, role = HOME_ADMIN
- [ ] **Expected**: Invitation created successfully.

### 1.4 Admin attempts duplicate invitation (existing user)
- [ ] Try creating invitation for admin@test.com (existing user)
- [ ] **Expected**: Error "User already exists"

---

## Test Session 2: User Accepts Invitation

### 2.1 VOLUNTEER - Sign up flow
- [ ] Open invitation link (from test 1.1) - URL: `/invite/[token]`
- [ ] **Step 1 - Account**: 
  - [ ] Enter name = "Test Volunteer"
  - [ ] Enter password = "password123"
  - [ ] Click Next
  - [ ] **Expected**: Validates and moves to step 2
- [ ] **Step 2 - Contact**:
  - [ ] Enter phone = "555-123-4567"
  - [ ] Click Next
  - [ ] **Expected**: Validates and moves to step 3
- [ ] **Step 3 - Details**:
  - [ ] Select skills: Art, Music
  - [ ] Enter referral source = "Friend"
  - [ ] Click Next
  - [ ] **Expected**: Validates and moves to step 4
- [ ] **Step 4 - Review**:
  - [ ] Review all information
  - [ ] Click "Complete Registration"
  - [ ] **Expected**: Account created, redirected to `/staff/onboarding?new=true`
- [ ] **Check**: User should have `volunteerReviewStatus = PENDING_REVIEW` in database

### 2.2 FACILITATOR - Sign up flow
- [ ] Open invitation from test 1.2
- [ ] Complete registration (steps 1-4)
- [ ] **Expected**: Redirects to `/staff` (not onboarding)

### 2.3 HOME_ADMIN - Sign up flow with facility request
- [ ] Open invitation from test 1.3
- [ ] Complete registration
- [ ] **Expected**: Redirects to `/dashboard`

### 2.4 Email change request during signup
- [ ] Create new VOLUNTEER invitation
- [ ] During signup, change email to different address
- [ ] Complete registration
- [ ] **Expected**: Shows "Pending Email Change" screen
- [ ] **Expected**: Admin receives notification about email change request

---

## Test Session 3: Onboarding Flow

### 3.1 New volunteer sees PENDING_REVIEW banner
- [ ] Login as volunteer (from test 2.1)
- [ ] Navigate to `/staff/onboarding`
- [ ] **Expected**: Yellow "Your application is pending review" banner shown

### 3.2 Profile form shows emergency contact fields
- [ ] On `/staff/onboarding` page
- [ ] Look for Emergency Contact section
- [ ] **Expected**: Contact Name, Relationship, Phone fields visible

### 3.3 Skills from signup pre-filled
- [ ] On `/staff/onboarding` page
- [ ] Look for Skills section
- [ ] **Expected**: Skills "Art", "Music" from signup are pre-filled

### 3.4 Save profile and complete onboarding
- [ ] Fill in emergency contact fields
- [ ] Click "Save & Continue"
- [ ] **Expected**: Profile saved, redirected to `/staff`

### 3.5 Skip onboarding
- [ ] Navigate to `/staff/onboarding`
- [ ] Click "Remind me later"
- [ ] **Expected**: Redirected to `/staff`

---

## Test Session 4: Admin Volunteer Dashboard

### 4.1 Admin views pending volunteers
- [ ] Login as ADMIN
- [ ] Navigate to `/admin/volunteers`
- [ ] **Expected**: See "Pending Review" section with the new volunteer

### 4.2 Admin approves volunteer
- [ ] On `/admin/volunteers` page
- [ ] Find pending volunteer from test 2.1
- [ ] Click "Approve" button
- [ ] **Expected**: 
  - Status changes to APPROVED
  - Volunteer gets in-app notification
  - Volunteer gets email notification
  - Page refreshes showing volunteer in "Approved" section

### 4.3 Admin requests corrections
- [ ] Create new volunteer invitation and signup
- [ ] Login as ADMIN
- [ ] Navigate to `/admin/volunteers`
- [ ] Find new volunteer in "Pending Review"
- [ ] Click "Request Corrections"
- [ ] **Expected**:
  - Status changes to REQUEST_CORRECTIONS
  - Volunteer gets notification
  - Volunteer gets email
  - Volunteer appears in "Request Corrections" section

---

## Test Session 5: Volunteer Portal Access

### 5.1 Approved volunteer can access portal
- [ ] Login as the approved volunteer (from test 4.2)
- [ ] Navigate to `/volunteers`
- [ ] **Expected**: Can access volunteer dashboard

### 5.2 Unapproved volunteer redirected (PENDING_REVIEW)
- [ ] Login as volunteer from test 4.3 (status = REQUEST_CORRECTIONS)
- [ ] Try to navigate to `/volunteers`
- [ ] **Expected**: Redirected to `/staff/onboarding`

### 5.3 Middleware blocks unapproved access
- [ ] Directly navigate to `/volunteers/forms` as unapproved volunteer
- [ ] **Expected**: Redirected to `/staff/onboarding`

### 5.4 Middleware blocks direct form fill
- [ ] Directly navigate to `/volunteers/forms/[id]/fill` as unapproved volunteer
- [ ] **Expected**: Redirected to `/staff/onboarding`

---

## Test Session 6: Form Submission Flow

### 6.1 Volunteer fills and submits form
- [ ] Login as APPROVED volunteer
- [ ] Navigate to `/volunteers/forms`
- [ ] Click on a form template
- [ ] Click "Fill Out Online"
- [ ] Fill in form fields
- [ ] Click Submit
- [ ] **Expected**: Form submitted, redirected to `/volunteers`

### 6.2 Volunteer views form submissions
- [ ] Navigate to `/volunteers/forms?tab=submissions`
- [ ] **Expected**: See submitted forms with status

---

## Test Session 7: Role-Based Routing

### 7.1 Login redirects by role
- [ ] Login as ADMIN
- [ ] **Expected**: Redirects to `/admin`
- [ ] Login as PAYROLL
- [ ] **Expected**: Redirects to `/payroll`
- [ ] Login as HOME_ADMIN
- [ ] **Expected**: Redirects to `/dashboard`
- [ ] Login as FACILITATOR
- [ ] **Expected**: Redirects to `/staff`
- [ ] Login as APPROVED VOLUNTEER
- [ ] **Expected**: Redirects to `/volunteers`

### 7.2 Unauthorized route access blocked
- [ ] As ADMIN, try to access `/staff`
- [ ] **Expected**: Redirected to `/admin`
- [ ] As FACILITATOR, try to access `/admin`
- [ ] **Expected**: Redirected to `/staff`

---

## Test Session 8: Edge Cases

### 8.1 Expired invitation token
- [ ] Create invitation with very short expiry (or wait for expiry)
- [ ] Try to use the link
- [ ] **Expected**: Error "Invalid or expired invitation"

### 8.2 Password too short
- [ ] During signup, enter password "123"
- [ ] **Expected**: Error "Password must be at least 6 characters"

### 8.3 Duplicate email invitation
- [ ] Try to create invitation for email that already has active user
- [ ] **Expected**: Error "User already exists"

### 8.4 Skip onboarding limit
- [ ] As volunteer, skip onboarding 3 times
- [ ] **Expected**: After 3 skips, onboarding is forced

---

## Test Summary

| Test ID | Feature | Status |
|---------|---------|--------|
| 1.1 | Admin create VOLUNTEER invite | [ ] |
| 1.2 | Admin create FACILITATOR invite | [ ] |
| 1.3 | Admin create HOME_ADMIN invite | [ ] |
| 1.4 | Duplicate user invitation blocked | [ ] |
| 2.1 | VOLUNTEER signup flow | [ ] |
| 2.2 | FACILITATOR signup flow | [ ] |
| 2.3 | HOME_ADMIN signup flow | [ ] |
| 2.4 | Email change request | [ ] |
| 3.1 | PENDING_REVIEW banner | [ ] |
| 3.2 | Emergency contact fields visible | [ ] |
| 3.3 | Skills pre-filled | [ ] |
| 3.4 | Complete onboarding | [ ] |
| 3.5 | Skip onboarding | [ ] |
| 4.1 | Admin views pending volunteers | [ ] |
| 4.2 | Admin approves volunteer | [ ] |
| 4.3 | Admin requests corrections | [ ] |
| 5.1 | Approved volunteer accesses portal | [ ] |
| 5.2 | Unapproved volunteer blocked | [ ] |
| 5.3 | Middleware blocks /volunteers/forms | [ ] |
| 5.4 | Middleware blocks form fill | [ ] |
| 6.1 | Volunteer submits form | [ ] |
| 6.2 | Volunteer views submissions | [ ] |
| 7.1 | Login redirects by role | [ ] |
| 7.2 | Unauthorized routes blocked | [ ] |
| 8.1 | Expired token rejected | [ ] |
| 8.2 | Short password rejected | [ ] |
| 8.3 | Duplicate email blocked | [ ] |
| 8.4 | Skip limit enforced | [ ] |

---

## Run Unit Tests

```bash
npm run test        # Run tests with UI
npm run test:run   # Run tests in CLI
npm run test:coverage  # Run with coverage report
```

**Current Test Results**: ✅ 148 tests passing