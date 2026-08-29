# Automated Timetable & Exam Seat Allocation System - Frontend

A modern, professional React-based frontend for managing examination schedules, room allocations, and invigilator assignments using intelligent optimization algorithms.

## 🎯 Project Overview

This is the frontend application for a comprehensive examination management system that includes:

- **Smart Timetable Generation**: Multi-step wizard to generate optimized exam schedules
- **Visual Seat Allocation**: Interactive seating arrangements with conflict resolution
- **Conflict Management**: Intelligent conflict detection and resolution center
- **Real-time Monitoring**: Dashboard with live statistics and notifications
- **Role-based Access**: Admin, Faculty, and Student views
- **Export Capabilities**: Generate reports in PDF and Excel formats

## 🏗️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **TanStack Query** - Server state management
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Lucide React** - Icon library

## 📦 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend API running on `http://localhost:3000` (default)
- PostgreSQL database (for backend)

### Installation

```bash
# Clone and navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

```
VITE_API_BASE_URL=http://localhost:3000/api
```

## 🚀 Project Structure

```
frontend/
├── src/
│   ├── api/                 # API client and service layer
│   │   ├── client.ts       # Axios instance with interceptors
│   │   ├── auth.ts         # Auth endpoints
│   │   ├── timetable.ts    # Timetable operations
│   │   └── ...             # Other feature APIs
│   ├── components/         # Reusable UI components
│   │   ├── LoadingSpinner.tsx
│   │   ├── Modal.tsx
│   │   ├── Button.tsx
│   │   └── ...
│   ├── contexts/           # React Context providers
│   │   └── AuthContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useStudents.ts
│   │   ├── useTimetable.ts
│   │   └── ...
│   ├── layouts/            # Layout components
│   │   └── DashboardLayout.tsx
│   ├── pages/              # Full page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── TimetablePage.tsx
│   │   ├── SeatAllocationPage.tsx
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── timetable.ts
│   │   └── ...
│   ├── utils/              # Helper functions and utilities
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── App.tsx             # Main app component with routing
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── index.html              # HTML entry point
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
├── tailwind.config.js      # Tailwind config
├── postcss.config.js       # PostCSS config
└── package.json
```

## 🎨 Design System

### Colors

- **Primary**: Blue (`#0284c7`)
- **Success**: Green
- **Warning**: Yellow
- **Danger**: Red
- **Neutral**: Gray scale

### Components

All UI components follow Tailwind CSS utility classes with consistent:
- Spacing (4px grid)
- Rounded corners (lg)
- Subtle shadows
- Smooth transitions

### Responsive Design

- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Fully responsive tables and forms
- Touch-friendly buttons (min 44px)

## 📋 Key Features

### Authentication
- Login/Register with email and password
- JWT token management with refresh
- Protected routes and role-based access
- Automatic session persistence

### Dashboard (Hero Feature)
- Welcome header with exam period
- Key statistics cards:
  - Total Students
  - Total Exams
  - Active Rooms
  - Pending Conflicts
  - Faculty Members
- Upcoming exams timeline
- Room utilization chart
- Recent notifications sidebar
- Quick action buttons

### Timetable Management (Hero Feature)
- **Multi-step Generation Wizard**:
  - Step 1: Select examination period (date range)
  - Step 2: Configure time slots (morning/afternoon/evening)
  - Step 3: Select rooms with capacity filter
  - Step 4: Choose exams to schedule
  - Step 5: Set optimization constraints
  - Step 6: Review and generate
- **Progress Tracking**:
  - Real-time job status updates
  - Shows stages: VALIDATING → CHECKING CONSTRAINTS → OPTIMIZING → FINALIZING
  - Automatic refresh every 2 seconds
- **Timetable Views**:
  - Calendar grid view
  - Table view with sorting/filtering
  - Day-by-day breakdown
  - Conflict indicators
- **Actions**:
  - Publish (with confirmation)
  - Regenerate with new constraints
  - Download as PDF/Excel
  - Resolve conflicts

### Seat Allocation (Hero Feature)
- **Visual Room Layout**:
  - Seat grid editor (drag-and-drop ready)
  - Seat details on hover
  - Color-coded by section/department
  - Highlight by exam or student
- **Generation**:
  - Configure anti-cheating rules
  - Separate by subject/section/department
  - Minimum column gap settings
  - Real-time progress tracking
- **Export**:
  - Download allocation as PDF
  - Export to Excel
  - Print room-wise seating charts

### Data Management
- **Students**: Full CRUD with pagination, search, department filter
- **Faculty**: Employee management, workload tracking
- **Departments**: Structure and statistics
- **Subjects**: Course management
- **Rooms**: Capacity management, facility tracking
- **Exams**: Registration and type management

### Conflict Resolution Center
- Filter by timetable, type, and severity
- Visual severity indicators (color-coded badges)
- Conflict types:
  - Student time conflicts
  - Room double-booking
  - Faculty workload
  - Capacity exceeded
  - Missing resources
- Resolution actions:
  - Move exam to different time
  - Change room
  - Reschedule
  - Mark as resolved
  - Add notes

### Reports
- Generate multiple report types:
  - Dashboard summary
  - Timetable details
  - Room utilization
  - Seat allocation analysis
  - Conflict statistics
  - Faculty workload distribution
  - Exam statistics
- Export formats: JSON, PDF, Excel
- Charts and visualizations:
  - Room utilization bar chart
  - Conflict distribution pie chart
  - Exam timeline
  - Faculty workload comparison

### Notifications
- Real-time notification center
- Unread count badge
- Filter by type
- Mark as read/unread
- Delete notifications
- Notification types:
  - Timetable published
  - Exam schedule changed
  - Room changed
  - Seat allocation ready
  - Conflict detected
  - System alerts

## 🔐 Authentication

### Login Flow
1. User enters email and password
2. Backend validates and returns JWT tokens
3. Access token stored in localStorage
4. User redirected to dashboard

### Token Management
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- Automatic refresh on API 401
- Manual refresh on token expiry
- Logout clears all tokens

### Role-Based Access
```typescript
Admin: Full access to all features
Faculty: View own schedule, invigilation assignments
Student: View personal timetable and seat allocation
```

## 🔗 API Integration

### Request Format
```typescript
// GET
GET /api/timetable?page=1&limit=20

// POST
POST /api/timetable/generate
{
  "name": "Exam Period 1",
  "startDate": "2024-01-15",
  "endDate": "2024-01-28",
  "timeSlots": [
    { "type": "MORNING", "start": "09:00", "end": "12:00" }
  ],
  "roomIds": ["room1", "room2"],
  "constraints": { "maxExamsPerDayPerStudent": 2 }
}
```

### Response Format
```typescript
{
  "data": { /* resource data */ },
  "pagination": { "page": 1, "limit": 20, "total": 100 },
  "error": null
}
```

### Interceptors
- **Request**: Automatically adds `Authorization: Bearer <token>`
- **Response**: Handles 401 with automatic token refresh
- **Error**: Converts to user-friendly messages

## 🎯 State Management

### Authentication (React Context)
- Global user state
- Login/logout/refresh functions
- Loading states

### Server State (TanStack Query)
- Automatic caching (5 min default)
- Background refetching
- Automatic garbage collection
- Optimistic updates for mutations

### Form State (React Hook Form)
- Component-level form management
- Zod validation
- Error handling
- Field-level validation messages

### UI State (Local useState)
- Modal open/close
- Tab selection
- Filter values
- Expanded sections

## 📊 Data Visualization

### Charts Used
- Line charts: Timeline data
- Bar charts: Comparisons
- Pie charts: Distributions
- Area charts: Trends

### Libraries
- **Recharts**: Main charting library
- Responsive containers
- Tooltip and legend support
- Color-coded by category

## 🧪 Development Workflow

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit

# Linting (if ESLint configured)
npm run lint
```

## 📱 Responsive Breakpoints

```css
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: > 1024px
```

## ♿ Accessibility

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Focus management
- Color contrast (WCAG AA)
- Alt text on images

## 🚀 Performance

- Code splitting by route
- Lazy component loading
- Query result caching
- Optimized re-renders with React.memo
- Bundled with Vite for fast HMR

## 🔍 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 Demo Credentials

Login with demo account:
- Email: `admin@college.edu`
- Password: `demo123456`

## 🐛 Debugging

### Browser DevTools
- React DevTools extension
- Network tab for API calls
- Local storage inspection

### Console Logging
```typescript
// API calls
console.log('Fetching...', url);

// State changes
console.log('User state:', user);

// Errors
console.error('API Error:', error);
```

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TanStack Query](https://tanstack.com/query)
- [React Router](https://reactrouter.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 🤝 Contributing

1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## 📄 License

This project is part of the hackathon submission. All rights reserved.

## 🎉 Ready to Launch

The frontend is now ready for feature implementation. See `IMPLEMENTATION_GUIDE.md` for detailed instructions on building each page and component.

**Next Steps:**
1. Install dependencies: `npm install`
2. Configure backend URL in `.env.local`
3. Start dev server: `npm run dev`
4. Implement pages following the guide
5. Connect to running backend
6. Test all features
7. Build for production: `npm run build`

Good luck! 🚀
