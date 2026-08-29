# Automated Timetable & Exam Seat Allocation System

A production-ready backend system for automated examination timetable generation, conflict detection, optimized room utilization, and fair exam seat allocation.

## Tech Stack

- **API Layer**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Optimization Engine**: Python + Google OR-Tools CP-SAT
- **Authentication**: JWT (access + refresh tokens) + bcrypt
- **Validation**: Zod
- **Documentation**: OpenAPI 3.0 / Swagger UI
- **Testing**: Jest + Supertest (TypeScript), pytest (Python)
- **Containerization**: Docker + Docker Compose

## Project Structure

```
backend/
├── src/                          # Node.js API
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # Entry point
│   ├── config/                   # Configuration
│   │   ├── database.ts           # Prisma client
│   │   ├── env.ts                # Environment validation
│   │   ├── jwt.ts                # JWT utilities
│   │   └── queue.ts              # In-memory job queue
│   ├── controllers/              # Request handlers
│   ├── routes/                   # Express routers
│   ├── services/                 # Business logic
│   ├── middleware/               # Auth, validation, errors
│   ├── validators/               # Zod schemas
│   ├── utils/                    # Helpers (Python client, exports, etc.)
│   └── jobs/                     # Background job processors
├── optimization/                 # Python microservice
│   ├── app.py                    # FastAPI entry point
│   ├── models/                   # Pydantic models
│   ├── timetable/                # OR-Tools CP-SAT solver
│   ├── seat_allocation/          # Seat assignment engine
│   ├── conflict_detection/       # Conflict detector
│   ├── room_optimization/        # Room assignment optimizer
│   ├── invigilator_allocation/   # Invigilator assignment
│   └── database/                 # Shared DB repository
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed data
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── optimization/             # Python optimization tests
├── docs/                         # Swagger/OpenAPI spec
├── docker/                       # Docker files
└── docker-compose.yml            # Multi-service setup
```

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 16+
- Docker & Docker Compose (recommended)

### Using Docker (Recommended)

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
docker-compose -f docker/docker-compose.yml up -d
```

This starts:
- PostgreSQL on port 5432
- Node.js API on port 3000
- Python Optimizer on port 8000 (internal)

### Manual Setup

1. **Install Node.js dependencies:**
```bash
cd backend
npm install
npx prisma generate
```

2. **Set up Python environment:**
```bash
cd backend/optimization
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

3. **Configure environment:**
```bash
cd backend
cp .env.example .env
# Edit .env with your database URL and secrets
```

4. **Run database migrations:**
```bash
npx prisma migrate dev --name init
```

5. **Seed database:**
```bash
npx prisma db seed
```

6. **Start services:**
```bash
# Terminal 1: Python optimizer
cd backend/optimization
python -m uvicorn app:app --host 0.0.0.0 --port 8000

# Terminal 2: Node.js API
cd backend
npm run dev
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## Key API Endpoints

### Authentication
```
POST   /api/auth/register     # Register (admin only)
POST   /api/auth/login        # Login
POST   /api/auth/refresh      # Refresh access token
POST   /api/auth/logout       # Logout
GET    /api/auth/me           # Current user profile
```

### Core Resources
```
GET    /api/departments       # List departments
POST   /api/departments       # Create department (admin)
GET    /api/students          # List students (paginated)
POST   /api/students          # Create student (admin)
GET    /api/faculty           # List faculty
POST   /api/faculty           # Create faculty (admin)
GET    /api/subjects          # List subjects
POST   /api/subjects          # Create subject (admin)
GET    /api/rooms             # List rooms
POST   /api/rooms             # Create room (admin)
GET    /api/exams             # List exams
POST   /api/exams             # Create exam (admin)
POST   /api/exams/:id/register # Register students for exam
```

### Timetable Generation
```
POST   /api/timetable/generate           # Start generation (returns jobId)
GET    /api/timetable/jobs/:jobId        # Check job status
GET    /api/timetable                    # List timetables
GET    /api/timetable/:id                # Get timetable with entries
POST   /api/timetable/:id/publish        # Publish timetable
POST   /api/timetable/:id/regenerate     # Regenerate timetable
GET    /api/timetable/:id/conflicts      # Get conflicts
POST   /api/timetable/:id/conflicts/:conflictId/resolve  # Resolve conflict
```

### Seat Allocation
```
POST   /api/seat-allocation/generate     # Generate seat allocation
GET    /api/seat-allocation/jobs/:jobId  # Check job status
GET    /api/seat-allocation              # List allocations
GET    /api/seat-allocation/:id/export   # Export PDF/Excel
```

### Invigilator Assignment
```
POST   /api/invigilators/generate        # Generate assignments
GET    /api/invigilators/assignments     # List assignments
GET    /api/invigilators/workload        # Faculty workload report
```

### Conflicts
```
GET    /api/conflicts                    # List conflicts
POST   /api/conflicts/detect             # Trigger detection
POST   /api/conflicts/:id/resolve        # Resolve conflict
GET    /api/conflicts/stats              # Conflict statistics
```

### Reports & Dashboard
```
GET    /api/reports/dashboard            # Dashboard statistics
GET    /api/reports/timetable            # Timetable report (PDF/Excel)
GET    /api/reports/rooms                # Room utilization
GET    /api/reports/seat-allocation      # Seat allocation report
GET    /api/reports/conflicts            # Conflict report
GET    /api/reports/faculty-workload     # Faculty workload
GET    /api/reports/exam-statistics      # Exam statistics
```

### Notifications
```
GET    /api/notifications                # List notifications
GET    /api/notifications/unread-count   # Unread count
POST   /api/notifications/:id/read       # Mark as read
POST   /api/notifications/read-all       # Mark all as read
```

## Timetable Generation Flow

1. Admin calls `POST /api/timetable/generate` with:
   - Examination period (start/end dates)
   - Time slots per day (morning/afternoon/evening)
   - Room IDs to use
   - Optional exam IDs (auto-detects from registrations if not provided)
   - Constraints configuration

2. System creates a `Timetable` record (status: `GENERATING`) and enqueues a background job

3. Python optimizer service:
   - Fetches exams, students, rooms, faculty from PostgreSQL
   - Runs OR-Tools CP-SAT solver with hard/soft constraints
   - Returns scheduled entries + statistics

4. Job processor saves `TimetableEntry` records, detects conflicts, updates status to `GENERATED`

5. Admin reviews conflicts, resolves if needed, then publishes

## Hard Constraints (Never Violated)

1. **Student conflicts**: No student has two exams at the same time
2. **Room conflicts**: No room hosts two exams simultaneously
3. **Capacity**: Room capacity never exceeded
4. **Faculty conflicts**: No faculty invigilates two exams simultaneously
5. **Period bounds**: All exams within configured examination period
6. **Valid slots**: Every exam gets a valid time slot

## Soft Constraints (Optimized)

1. Minimize back-to-back exams for students
2. Minimize room capacity wastage
3. Balance room utilization
4. Balance invigilator workload
5. Prefer morning slots for large exams
6. Anti-cheating seating (separate same section/subject/department)

## Seat Allocation Anti-Cheating Rules

- **Same subject**: Prefer not adjacent horizontally (soft)
- **Same section**: Prefer not adjacent in any direction (soft)
- **Same department**: Prefer separated where practical (soft)
- **Hard constraint**: Valid seating + room capacity always prioritized

## Invigilator Ratio

- Default: 1 invigilator per 30 students
- Configurable per generation request
- Includes chief invigilator + relievers (10% default)

## Running Tests

```bash
# Node.js tests
cd backend
npm test
npm run test:coverage

# Python tests
cd backend/optimization
pytest tests/ -v
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_ACCESS_SECRET` | Access token secret (min 32 chars) | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) | Required |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` |
| `PORT` | API server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `PYTHON_SERVICE_URL` | Python optimizer URL | `http://localhost:8000` |
| `PYTHON_SERVICE_API_KEY` | Internal API key | Required |
| `CORS_ORIGIN` | Frontend origin | `http://localhost:5173` |

## Seed Data

The seed script creates:
- 5 Departments (CSE, ECE, MECH, CIVIL, IT)
- 50 Subjects (10 per department)
- 500 Students (distributed across depts/semesters/sections)
- 20 Faculty (4 per department)
- 12 Rooms (capacities: 30-300)
- 30 Exams with realistic registrations
- Conflicting scenarios for testing

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secrets (64+ chars)
3. Configure PostgreSQL with connection pooling
4. Use reverse proxy (nginx) with SSL
5. Enable rate limiting
6. Set up monitoring/logging
7. Use Docker multi-stage builds for smaller images

## Frontend Integration

The API is designed for a React + Vite + Tailwind frontend:

- Predictable JSON responses with `success`, `data`, `error`, `meta`
- Pagination, filtering, sorting on all list endpoints
- Standardized error codes for UI handling
- WebSocket-ready notification system (polling fallback)
- PDF/Excel exports for reports

## License

MIT License - Hackathon Project