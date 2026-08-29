from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class TimetableEntryOutput(BaseModel):
    exam_id: str
    room_id: str
    date: str
    start_time: str
    end_time: str


class TimetableStatistics(BaseModel):
    exams_scheduled: int
    conflicts_detected: int
    conflicts_resolved: int
    remaining_conflicts: int
    room_utilization: float
    rooms_used: int
    students_affected: int
    invigilators_assigned: int
    optimization_score: float
    generation_time: float


class ConflictOutput(BaseModel):
    type: str
    severity: str
    description: str
    entity_type: str
    entity_id: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None


class TimetableGenerationResponse(BaseModel):
    status: str
    entries: List[TimetableEntryOutput]
    statistics: TimetableStatistics
    conflicts: Optional[List[ConflictOutput]] = None


class SeatAllocationOutput(BaseModel):
    student_id: str
    exam_id: str
    room_id: str
    seat_row: str
    seat_column: int
    seat_number: str


class SeatAllocationStatistics(BaseModel):
    total_allocated: int
    rooms_used: int
    anti_cheating_violations: int


class SeatAllocationResponse(BaseModel):
    allocations: List[SeatAllocationOutput]
    statistics: SeatAllocationStatistics


class InvigilatorAssignmentOutput(BaseModel):
    exam_id: str
    faculty_id: str
    room_id: str
    date: str
    start_time: str
    end_time: str
    role: str


class InvigilatorStatistics(BaseModel):
    total_assigned: int
    faculty_utilized: int
    average_workload: float


class InvigilatorAllocationResponse(BaseModel):
    assignments: List[InvigilatorAssignmentOutput]
    statistics: InvigilatorStatistics


class ConflictDetectionResponse(BaseModel):
    conflicts: List[ConflictOutput]