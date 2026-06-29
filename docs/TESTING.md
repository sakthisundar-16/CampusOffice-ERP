# End-to-End Testing Guide

This document provides comprehensive testing procedures for the CampusOffice ERP Production Readiness Sprint.

## Prerequisites

1. **Database Setup**
   - Run database migration: `python backend/migrate.py`
   - Ensure PostgreSQL is running
   - Ensure Redis is running

2. **Environment Setup**
   - Backend: `cd backend && python -m uvicorn app.main:app --reload`
   - Frontend: `cd frontend && npm run dev`

3. **Test Data**
   - Seed data: `python backend/seed_data.py`
   - Ensure at least 1 student, 1 staff, and 1 admin user exist

## Test Workflows

### 1. Student Portal Workflow

#### Test Case 1.1: Student Dashboard Unified Portal
**Objective:** Verify student dashboard displays all integrated information

**Steps:**
1. Login as student user
2. Navigate to `/student`
3. Verify dashboard displays:
   - Student name,Roll Number, Semester
   - Fee Summary (Total, Paid, Pending, Progress)
   - Upcoming Due Dates
   - Recent Activity History
   - Active Unified Requests
   - Quick Actions

**Expected Results:**
- All sections load without errors
- Data is accurate and up-to-date
- Activity history shows recent actions
- Unified requests display current status

**API Endpoints Tested:**
- `GET /api/v1/student/dashboard`

---

#### Test Case 1.2: Payment Request Workflow
**Objective:** Verify payment submission and approval workflow

**Steps:**
1. Student submits payment request
2. Verify Request Engine creates unified request
3. Staff approves payment
4. Verify automation workflow executes:
   - Fee ledger updated
   - Receipt generated
   - Notification sent
   - Dashboard updated
   - Audit log created

**Expected Results:**
- Payment request created with unique request number
- Unified request linked to payment
- Approval triggers all workflow steps
- Student receives notification
- Audit log records action

**API Endpoints Tested:**
- `POST /api/v1/student/payments`
- `POST /api/v1/staff/payments/{id}/approve`
- `GET /api/v1/student/dashboard`

---

#### Test Case 1.3: Document Request Workflow
**Objective:** Verify document request and certificate generation

**Steps:**
1. Student requests document (e.g., Bonafide)
2. Verify Request Engine creates unified request
3. Staff approves document
4. Verify automation workflow executes:
   - PDF generated
   - QR code generated
   - Document metadata created
   - Notification sent
   - Dashboard updated

**Expected Results:**
- Document request created with request number
- Certificate number generated
- Verification code generated
- Document metadata stored
- Student can download certificate

**API Endpoints Tested:**
- `POST /api/v1/student/documents/requests`
- `POST /api/v1/staff/documents/{id}/approve`
- `GET /api/v1/student/documents/requests`

---

### 2. Office Work Center Workflow

#### Test Case 2.1: Staff Dashboard Work Center
**Objective:** Verify staff dashboard displays work queue and activities

**Steps:**
1. Login as staff user
2. Navigate to `/staff`
3. Verify dashboard displays:
   - Work Queue Statistics
   - Recent Activities
   - Today's Notifications
   - Unified Request Statistics
   - Quick Processing Actions

**Expected Results:**
- All sections load without errors
- Work queue shows accurate counts
- Activities display recent staff actions
- Notifications show unread count

**API Endpoints Tested:**
- `GET /api/v1/staff/dashboard`

---

#### Test Case 2.2: Payment Approval Workflow
**Objective:** Verify staff can approve/reject payments with automation

**Steps:**
1. Staff views pending payments
2. Staff approves a payment
3. Verify workflow automation:
   - Payment status updated
   - Receipt generated
   - Student notified
   - Audit log created
4. Staff rejects a payment
5. Verify rejection workflow:
   - Status updated to rejected
   - Student notified
   - Remarks recorded

**Expected Results:**
- Approval/rejection executes correctly
- All automation steps complete
- Student receives appropriate notification

**API Endpoints Tested:**
- `GET /api/v1/staff/payments`
- `POST /api/v1/staff/payments/{id}/approve`
- `POST /api/v1/staff/payments/{id}/reject`

---

#### Test Case 2.3: Document Approval Workflow
**Objective:** Verify staff can approve/reject document requests

**Steps:**
1. Staff views pending document requests
2. Staff approves a document
3. Verify workflow automation:
   - PDF generated
   - Certificate number assigned
   - Verification code generated
   - Document metadata created
   - Student notified
4. Staff rejects a document
5. Verify rejection workflow

**Expected Results:**
- Certificate generated with verification
- Document metadata properly stored
- Student can verify certificate

**API Endpoints Tested:**
- `GET /api/v1/staff/documents/work-queue`
- `POST /api/v1/staff/documents/{id}/approve`
- `POST /api/v1/staff/documents/{id}/reject`

---

### 3. System Management Center Workflow

#### Test Case 3.1: Admin Dashboard System Management
**Objective:** Verify admin dashboard displays system health and statistics

**Steps:**
1. Login as admin user
2. Navigate to `/admin`
3. Verify dashboard displays:
   - System Statistics
   - System Health (Database, Redis, Storage)
   - Recent Audit Logs
   - Unified Request Statistics
   - Quick Management Actions

**Expected Results:**
- All sections load without errors
- System health shows correct status
- Audit logs display recent admin actions
- Statistics are accurate

**API Endpoints Tested:**
- `GET /api/v1/admin/dashboard`

---

### 4. Global Search Workflow

#### Test Case 4.1: Unified Search
**Objective:** Verify global search across all modules

**Steps:**
1. Login as staff/admin
2. Navigate to `/search`
3. Search for:
   - Student by name/roll number
   - Payment by request ID/receipt number
   - Document by request number/certificate number
   - Bonafide by student name
   - Staff by name/staff ID
   - Unified request by request number

**Expected Results:**
- Search returns relevant results from all modules
- Results are paginated correctly
- Search results are cached in Redis

**API Endpoints Tested:**
- `GET /api/v1/search/`

---

### 5. Notification Center Workflow

#### Test Case 5.1: Notification Management
**Objective:** Verify notification center functionality

**Steps:**
1. Student receives notification
2. Check unread count
3. Mark notification as read
4. Mark all as read
5. Archive notification
6. Delete notification

**Expected Results:**
- Unread count updates correctly
- Read status changes
- Archive removes from main list
- Delete permanently removes notification

**API Endpoints Tested:**
- `GET /api/v1/notifications/unread-count`
- `GET /api/v1/notifications/`
- `PATCH /api/v1/notifications/{id}/read`
- `PATCH /api/v1/notifications/read-all`
- `PATCH /api/v1/notifications/{id}/archive`
- `DELETE /api/v1/notifications/{id}`

---

### 6. RBAC Security Workflow

#### Test Case 6.1: Role-Based Access Control
**Objective:** Verify users can only access authorized endpoints

**Steps:**
1. Student tries to access staff endpoints → Should fail
2. Staff tries to access admin endpoints → Should fail
3. Student tries to access another student's data → Should fail
4. Staff can access any student's data → Should succeed
5. Admin can access all data → Should succeed

**Expected Results:**
- Unauthorized access returns 403 Forbidden
- Cross-user data access prevented
- Role-based restrictions enforced

**API Endpoints Tested:**
- All role-protected endpoints

---

### 7. Audit System Workflow

#### Test Case 7.1: Audit Logging
**Objective:** Verify all actions are logged in audit system

**Steps:**
1. Perform various actions (login, payment, document, etc.)
2. Check audit logs for each action
3. Verify audit log contains:
   - User ID
   - Action
   - Details
   - IP address
   - User agent
   - Timestamp

**Expected Results:**
- All actions logged correctly
- Audit logs contain complete information
- Logs can be filtered and exported

**API Endpoints Tested:**
- Audit logging is automatic via `AuditService`

---

### 8. Performance Optimization Workflow

#### Test Case 8.1: Redis Caching
**Objective:** Verify Redis caching improves performance

**Steps:**
1. Load dashboard data (first request)
2. Load dashboard data again (should be cached)
3. Verify cache hit
4. Invalidate cache
5. Load data again (should fetch fresh)

**Expected Results:**
- First request fetches from database
- Second request returns from cache
- Cache invalidation forces fresh fetch
- Performance improvement measurable

**API Endpoints Tested:**
- All cached endpoints (dashboard, search, etc.)

---

### 9. Document Verification Workflow

#### Test Case 9.1: Certificate Verification
**Objective:** Verify certificate verification system

**Steps:**
1. Student downloads certificate
2. Access verification URL
3. Enter certificate number or verification code
4. Verify certificate details displayed correctly

**Expected Results:**
- Verification URL is accessible
- Certificate number validates
- Verification code validates
- Student details displayed correctly

**API Endpoints Tested:**
- `GET /api/v1/verify/certificate/{certificate_number}`
- `GET /api/v1/verify/code/{verification_code}`

---

## Test Checklist

### Backend Tests
- [ ] Database migration runs successfully
- [ ] All API endpoints respond correctly
- [ ] Request Engine creates unified requests
- [ ] Timeline entries are created for requests
- [ ] Activity history is logged
- [ ] Document metadata is generated
- [ ] Workflow automation executes correctly
- [ ] RBAC enforces access control
- [ ] Audit logs are created
- [ ] Redis caching works
- [ ] Notification service functions
- [ ] Global search returns results

### Frontend Tests
- [ ] Student portal loads correctly
- [ ] Office work center loads correctly
- [ ] System management center loads correctly
- [ ] Toast notifications display
- [ ] Loading skeletons show during fetch
- [ ] Confirm dialogs work
- [ ] Forms validate correctly
- [ ] Error handling works
- [ ] Responsive design works

### Integration Tests
- [ ] Payment workflow end-to-end
- [ ] Document workflow end-to-end
- [ ] Result publication workflow
- [ ] Notification delivery
- [ ] Certificate verification
- [ ] Search functionality
- [ ] Audit trail completeness

## Known Issues & Limitations

1. **Real-time Notifications:** WebSocket implementation pending
2. **File Uploads:** Large file handling needs testing
3. **Concurrent Requests:** Race condition handling needs verification
4. **Database Performance:** Query optimization may be needed for large datasets

## Test Execution Commands

```bash
# Run database migration
cd backend
python migrate.py

# Seed test data
python seed_data.py

# Start backend server
python -m uvicorn app.main:app --reload --port 8000

# Start frontend server
cd ../frontend
npm run dev

# Run tests (if test suite is implemented)
npm test
```

## Test Data Requirements

Minimum test data:
- 3 Students (different semesters)
- 2 Staff members
- 1 Admin user
- 2 Departments
- 2 Semesters
- 4 Fee structures
- 3 Document types
- Sample payment requests
- Sample document requests
- Sample results

## Success Criteria

All workflows are considered successful when:
1. All test cases pass without errors
2. Data integrity is maintained throughout
3. Performance meets acceptable thresholds
4. Security measures are enforced
5. Audit trails are complete
6. User experience is smooth
