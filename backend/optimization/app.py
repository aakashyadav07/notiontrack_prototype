from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from typing import Optional

from models.request import (
    TimetableGenerationRequest,
    SeatAllocationRequest,
    InvigilatorAllocationRequest,
    ConflictDetectionRequest,
)
from models.response import (
    TimetableGenerationResponse,
    SeatAllocationResponse,
    InvigilatorAllocationResponse,
    ConflictDetectionResponse,
)
from timetable.solver import TimetableSolver
from seat_allocation.allocator import SeatAllocator
from invigilator_allocation.allocator import InvigilatorAllocator
from conflict_detection.detector import ConflictDetector
from database.repository import repository


API_KEY = os.getenv("PYTHON_SERVICE_API_KEY", "internal-service-key-change-in-production")


async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await repository.connect()
    yield
    await repository.close()


app = FastAPI(
    title="Timetable Optimization Service",
    description="Internal optimization engine for timetable generation, seat allocation, and invigilator assignment",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "optimization"}


@app.post("/api/v1/timetable/generate", response_model=TimetableGenerationResponse, dependencies=[Depends(verify_api_key)])
async def generate_timetable(request: TimetableGenerationRequest):
    solver = TimetableSolver()
    result = await solver.solve(request)
    return result


@app.post("/api/v1/seat-allocation/generate", response_model=SeatAllocationResponse, dependencies=[Depends(verify_api_key)])
async def generate_seat_allocation(request: SeatAllocationRequest):
    allocator = SeatAllocator()
    result = allocator.allocate(request)
    return result


@app.post("/api/v1/invigilators/generate", response_model=InvigilatorAllocationResponse, dependencies=[Depends(verify_api_key)])
async def generate_invigilator_assignments(request: InvigilatorAllocationRequest):
    allocator = InvigilatorAllocator()
    result = allocator.allocate(request)
    return result


@app.post("/api/v1/conflicts/detect", response_model=ConflictDetectionResponse, dependencies=[Depends(verify_api_key)])
async def detect_conflicts(request: ConflictDetectionRequest):
    detector = ConflictDetector()
    result = detector.detect(request)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)