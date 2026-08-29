# Timetable Management System - Frontend Implementation Guide

## Project Setup

```bash
cd frontend
npm install
npm run dev  # Start development server at http://localhost:5173
```

## Environment Configuration

Create `.env.local`:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Completed Files

✅ Configuration:
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS themes
- `postcss.config.js` - PostCSS processing
- `package.json` - Dependencies and scripts

✅ API Layer:
- `src/api/client.ts` - Axios client with auth interceptors
- `src/api/auth.ts` - Authentication endpoints

✅ Types:
- `src/types/auth.ts` - Authentication types
- `src/types/timetable.ts` - Timetable/Exam types

✅ Contexts:
- `src/contexts/AuthContext.tsx` - Global auth state

✅ Core Application:
- `src/App.tsx` - Main app with routing
- `src/main.tsx` - Entry point
- `src/index.css` - Global styles

✅ Components:
- `src/components/LoadingSpinner.tsx` - Loading state

## Files to Create

### 1. Layout Components (`src/layouts/`)

**DashboardLayout.tsx** - Main layout with sidebar
```typescript
// Contains:
// - Sidebar navigation with collapsible menu
// - Top header with user menu and notifications
// - Main content area with Outlet
// - Role-based navigation visibility
```

### 2. Pages (`src/pages/`)

**LoginPage.tsx** - Authentication
```typescript
// Form with email/password
// Login and register tabs
// Redirect to dashboard on success
// Uses react-hook-form + zod validation
```

**DashboardPage.tsx** - Main dashboard (HERO PAGE)
```typescript
// Top: Welcome header + current exam period
// Statistics cards: Students, Exams, Rooms, Conflicts, Faculty
// Main content:
//   - Timetable overview (calendar view)
//   - Upcoming exams table
//   - Room utilization chart (Recharts)
// Sidebar:
//   - Recent notifications
//   - Quick actions
// Uses TanStack Query for real-time data
```

**TimetablePage.tsx** - Timetable hero feature
```typescript
// Tabs: Generate | View | Published
// Generate tab:
//   - Multi-step form wizard
//   - Step 1: Period selection (dates)
//   - Step 2: Time slots configuration
//   - Step 3: Room selection
//   - Step 4: Exam selection
//   - Step 5: Constraints (max exams/day, gaps, etc)
//   - Step 6: Review & submit
// View tab:
//   - List of timetables
//   - Calendar grid view of entries
//   - Conflict indicator badges
//   - Status indicators
// Job polling for generation progress
// Shows progress: VALIDATING → CHECKING CONSTRAINTS → OPTIMIZING → etc.
// Publish with confirmation modal
```

**SeatAllocationPage.tsx** - Visual seating
```typescript
// List of allocations by timetable
// Visual room layout with seats
// Seat details: Student name, ID, exam, subject
// Color coding by section/department
// Generate button with modal
// Regenerate option
// Export as PDF/Excel
// Job status polling
```

**StudentsPage.tsx** - Student management
```typescript
// Table with pagination
// Columns: Student ID, Name, Department, Semester, Section
// Search by name/ID
// Filter by department
// CRUD buttons (Add, Edit, Delete)
// Modal forms for add/edit
```

**FacultyPage.tsx** - Faculty management
```typescript
// Table: Employee ID, Name, Department, Designation, Max Workload
// Search and filter
// Show assigned invigilation count
// CRUD operations
```

**RoomsPage.tsx** - Room management
```typescript
// Table: Room code, Name, Capacity, Floor, Building
// Filters: Active status, has projector, has AC
// Seat layout editor (visual grid)
// CRUD operations
```

**ExamsPage.tsx** - Exam management
```typescript
// Table: Subject, Type, Duration, Student Count, Status
// Status badges (DRAFT, SCHEDULED, PUBLISHED, etc)
// Register/unregister students modal
// CRUD operations
```

**ConflictsPage.tsx** - Conflict resolution center
```typescript
// Filter by: Timetable, Type, Severity
// Table columns:
//   - Type (STUDENT_TIME_CONFLICT, ROOM_DOUBLE_BOOKING, etc)
//   - Severity (color-coded badges)
//   - Description
//   - Status (Resolved/Unresolved)
// Action buttons: Move exam, Change room, Change time, Ignore
// Resolution confirmation modal
// Statistics: Total, by type, by severity
```

**ReportsPage.tsx** - Report generation
```typescript
// Report type selector (dropdown)
// Generate button
// Table with format options (JSON, PDF, Excel)
// Download links
// Charts for:
//   - Room utilization
//   - Exam distribution
//   - Faculty workload
//   - Conflict summary
```

**NotificationsPage.tsx** - Notification center
```typescript
// List of notifications
// Unread badge count
// Filter by type
// Mark as read / Mark all as read
// Delete notification
// Notification detail modal
```

**SettingsPage.tsx** - User settings
```typescript
// Profile section: Display name, email
// Password change form
// Preferences
// Clear cache button
```

### 3. API Services (`src/api/`)

Create files for each feature:
- `students.ts` - Student CRUD
- `faculty.ts` - Faculty management
- `rooms.ts` - Room operations
- `exams.ts` - Exam management
- `conflicts.ts` - Conflict operations
- `reports.ts` - Report generation
- `notifications.ts` - Notification operations

### 4. Types (`src/types/`)

Create files:
- `student.ts` - Student model
- `faculty.ts` - Faculty model
- `room.ts` - Room model
- `exam.ts` - Exam model (extend timetable.ts)
- `conflict.ts` - Conflict types
- `report.ts` - Report types
- `notification.ts` - Notification types
- `common.ts` - Shared types (pagination, response, etc)

### 5. Hooks (`src/hooks/`)

Create custom hooks:
- `useStudents()` - Student queries/mutations
- `useTimetable()` - Timetable operations
- `useSeatAllocation()` - Seat allocation
- `useNotifications()` - Notification management
- `useJobPolling()` - Background job status

### 6. Utils (`src/utils/`)

- `formatters.ts` - Date/time/currency formatting
- `validators.ts` - Zod schemas
- `constants.ts` - App constants (enums, defaults)
- `errors.ts` - Error handling utilities

### 7. Components (`src/components/`)

Reusable UI components:
- `Modal.tsx` - Modal dialog wrapper
- `Button.tsx` - Button component variations
- `Input.tsx` - Form input with label
- `Select.tsx` - Dropdown select
- `Table.tsx` - Data table with sorting/filtering
- `Card.tsx` - Card wrapper
- `Badge.tsx` - Status badge component
- `Notification.tsx` - Toast notification
- `Sidebar.tsx` - Navigation sidebar
- `Header.tsx` - Top header
- `Pagination.tsx` - Pagination control
- `Tooltip.tsx` - Tooltip wrapper
- `Dialog/ConfirmDialog.tsx` - Confirmation modal

### 8. Copy config files to output

Create `.env.example`:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

Create `index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Timetable Management System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

## Implementation Order

1. **Phase 1 - Core Setup** (Completed ✅)
   - API client and interceptors
   - Auth context and flow
   - Routing setup

2. **Phase 2 - Layouts & Navigation**
   - DashboardLayout
   - Sidebar with role-based menus
   - Header component

3. **Phase 3 - Authentication Pages**
   - LoginPage
   - Integration with AuthContext

4. **Phase 4 - Data Management Pages**
   - StudentsPage
   - FacultyPage
   - RoomsPage
   - ExamsPage (basic)

5. **Phase 5 - Hero Features**
   - DashboardPage (with charts)
   - TimetablePage (with generation wizard)
   - SeatAllocationPage (with visual layout)

6. **Phase 6 - Admin Features**
   - ConflictsPage
   - ReportsPage
   - InvigilatorPage

7. **Phase 7 - Utilities**
   - NotificationsPage
   - SettingsPage
   - User profile

8. **Phase 8 - Polish**
   - Error boundaries
   - Loading states
   - Toast notifications
   - Accessibility improvements

## Key Design Patterns Used

### API Data Fetching
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['timetables'],
  queryFn: () => timetableApi.list(),
});
```

### Form Handling
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### Mutations
```typescript
const mutation = useMutation({
  mutationFn: (data) => timetableApi.generate(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timetables'] }),
});
```

### Job Polling
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // Poll job status every 2 seconds
    checkJobStatus(jobId);
  }, 2000);
  return () => clearInterval(interval);
}, [jobId]);
```

## Styling Approach

- **Color Scheme**: Primary blue (from Tailwind), neutral grays
- **Components**: Rounded corners (lg), subtle shadows
- **Spacing**: 4px base grid
- **Typography**: 
  - Headings: Inter 700/600
  - Body: Inter 400
  - Small: Inter 400
- **Responsive**: Mobile-first, breakpoints at 640/768/1024/1280
- **Hover States**: Subtle scale + color transitions

## State Management Strategy

- **Auth State**: React Context (AuthContext)
- **Server State**: TanStack Query (automatic caching, refetching)
- **Form State**: React Hook Form (local to component)
- **UI State**: Local useState (modals, tabs, filters)

## Error Handling

All API calls wrapped in try-catch:
```typescript
try {
  const result = await apiFunction();
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
  } else if (error.response?.status >= 500) {
    // Show server error toast
  } else {
    // Show validation error
  }
}
```

## Testing Strategy

- Components: React Testing Library
- API mocks: MSW (Mock Service Worker)
- E2E: Playwright for critical flows

## Performance Optimizations

1. Code splitting by route
2. Image optimization (if any)
3. Query caching (5 min default)
4. Lazy component loading
5. Memoization of expensive computations

## Production Build

```bash
npm run build
npm run preview  # Test production build locally
```

## Demo Flow (for Hackathon Judges)

1. Login with demo credentials
2. View Dashboard with statistics
3. Navigate to Timetable → Generate
4. Fill multi-step wizard
5. Watch job progress (VALIDATING → OPTIMIZING → FINALIZING)
6. View generated timetable with calendar
7. Resolve a conflict
8. Publish timetable
9. Generate seat allocation
10. View visual seating map
11. Export report as PDF

---

## Notes

- All form validation uses Zod schemas matching backend
- API responses follow `{ data, pagination?, error? }` format
- All async operations show loading states
- Error messages are user-friendly
- Responsive design tested on mobile, tablet, desktop
- Accessibility: WCAG 2.1 AA target
- Dark mode: Not required for MVP

---

**Total Estimated LOC**: ~3,500 lines of JSX/TypeScript
**Estimated Build Time**: 4-6 hours with the structure provided

Good luck with the implementation! 🚀
