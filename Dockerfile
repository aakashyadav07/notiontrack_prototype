# ============================================================
# Automated Timetable & Exam Seat Allocation System
# Single-container deployment for platforms that expose one port
#
# Expected build context:
#   ./frontend
#   ./backend
#   ./Dockerfile
# ============================================================

# ------------------------------------------------------------
# 1. Frontend build
# ------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# The browser talks to the Node API through Nginx at /api.
ENV VITE_API_BASE_URL=/api

RUN npm run build


# ------------------------------------------------------------
# 2. Backend build
# ------------------------------------------------------------
FROM node:20-bookworm-slim AS backend-build

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./

RUN npx prisma generate
RUN npm run build


# ------------------------------------------------------------
# 3. Python dependency build
# ------------------------------------------------------------
FROM python:3.11-slim AS python-deps

WORKDIR /app/optimization

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/optimization/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt


# ------------------------------------------------------------
# 4. Final runtime image
# ------------------------------------------------------------
FROM node:20-bookworm-slim

WORKDIR /app

# Runtime dependencies:
# - python3: runs FastAPI/OR-Tools
# - nginx: serves React and proxies /api
# - postgresql-client: pg_isready for database readiness
# - curl: container health check / service readiness
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        nginx \
        postgresql-client \
        curl && \
    rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------
# Backend
# ------------------------------------------------------------
COPY --from=backend-build /app/backend/package*.json ./backend/
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/prisma ./backend/prisma

# ------------------------------------------------------------
# Frontend
# ------------------------------------------------------------
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# ------------------------------------------------------------
# Python optimizer
# ------------------------------------------------------------
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY backend/optimization ./optimization

# ------------------------------------------------------------
# Nginx
# Public service: :8000
# React: static files
# /api/*: proxied to Node :3000
# ------------------------------------------------------------
RUN rm -f /etc/nginx/sites-enabled/default && \
    cat > /etc/nginx/sites-available/default <<'NGINX'
server {
    listen 8000;
    server_name _;

    root /app/frontend/dist;
    index index.html;

    location = /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

# ------------------------------------------------------------
# Startup script
# ------------------------------------------------------------
RUN cat > /app/start.sh <<'SH'
#!/bin/sh
set -eu

PIDS=""

cleanup() {
    echo "Stopping services..."
    if [ -n "${PIDS}" ]; then
        kill ${PIDS} 2>/dev/null || true
    fi
    nginx -s quit 2>/dev/null || true
}

trap cleanup TERM INT EXIT

# ----------------------------------------------------------
# Check required environment variables
# ----------------------------------------------------------
echo "Checking environment variables..."
if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set."
    echo "Please set DATABASE_URL in your deployment environment."
    exit 1
fi

echo "DATABASE_URL is set (length: ${#DATABASE_URL})"

# Check other required env vars
if [ -z "${JWT_ACCESS_SECRET:-}" ]; then
    echo "WARNING: JWT_ACCESS_SECRET not set"
fi
if [ -z "${JWT_REFRESH_SECRET:-}" ]; then
    echo "WARNING: JWT_REFRESH_SECRET not set"
fi
if [ -z "${PYTHON_SERVICE_API_KEY:-}" ]; then
    echo "WARNING: PYTHON_SERVICE_API_KEY not set"
fi

# ----------------------------------------------------------
# Wait for PostgreSQL before anything that uses Prisma or
# the Python repository.
# ----------------------------------------------------------
echo "Waiting for PostgreSQL..."
DB_READY=0
for i in $(seq 1 60); do
    if pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
        DB_READY=1
        break
    fi
    echo "Waiting for PostgreSQL... attempt $i/60"
    sleep 2
done

if [ "$DB_READY" -ne 1 ]; then
    echo "ERROR: PostgreSQL did not become ready in time (120 seconds)."
    echo "DATABASE_URL: $DATABASE_URL"
    echo "Check that PostgreSQL is running and accessible from this container."
    exit 1
fi

echo "PostgreSQL is ready."

# ----------------------------------------------------------
# Run Prisma db push
# ----------------------------------------------------------
echo "Running Prisma db push..."
cd /app/backend
if ! npx prisma db push --skip-generate; then
    echo "ERROR: Prisma db push failed."
    echo "This might be due to database connection issues or schema conflicts."
    exit 1
fi
echo "Prisma db push completed."

# ----------------------------------------------------------
# Start Python optimizer.
# The actual project file is /app/optimization/app.py.
# ----------------------------------------------------------
echo "Starting Python optimizer..."
cd /app/optimization
python3 -m uvicorn app:app --host 0.0.0.0 --port 8001 &
PYTHON_PID=$!
PIDS="$PIDS $PYTHON_PID"

# Give FastAPI a moment to start and verify it.
PYTHON_READY=0
for i in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:8001/health >/dev/null 2>&1; then
        PYTHON_READY=1
        break
    fi
    echo "Waiting for Python optimizer... attempt $i/30"
    sleep 1
done

if [ "$PYTHON_READY" -ne 1 ]; then
    echo "ERROR: Python optimization service failed to start."
    echo "Check Python service logs above for errors."
    kill $PYTHON_PID 2>/dev/null || true
    exit 1
fi

echo "Python optimization service is ready."

# ----------------------------------------------------------
# Start Node backend on its internal port.
# ----------------------------------------------------------
echo "Starting Node backend..."
cd /app/backend
node dist/server.js &
NODE_PID=$!
PIDS="$PIDS $NODE_PID"

# Wait until Node reports healthy.
NODE_READY=0
for i in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:3000/health >/dev/null 2>&1; then
        NODE_READY=1
        break
    fi
    echo "Waiting for Node backend... attempt $i/30"
    sleep 1
done

if [ "$NODE_READY" -ne 1 ]; then
    echo "ERROR: Node backend failed to start."
    echo "Check Node backend logs above for errors."
    kill $NODE_PID 2>/dev/null || true
    exit 1
fi

echo "Node backend is ready."

# ----------------------------------------------------------
# Start Nginx in foreground/background combination.
# Nginx is the only publicly exposed process and listens on :8000.
# ----------------------------------------------------------
echo "Starting Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!
PIDS="$PIDS $NGINX_PID"

echo "Application is ready on port 8000."

wait "$NGINX_PID"
SH

RUN chmod +x /app/start.sh

ENV NODE_ENV=production \
    PORT=3000 \
    API_PREFIX=/api \
    PYTHON_SERVICE_URL=http://127.0.0.1:8001

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health >/dev/null || exit 1

CMD ["/app/start.sh"]
