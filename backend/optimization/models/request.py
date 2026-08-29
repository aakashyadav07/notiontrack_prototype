from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class TimeSlot(BaseModel):
    type: str
    start: str
    end: str


class RoomInput(BaseModel):
    id: str
    capacity: int
    building: Optional[str] = None


class ExamInput(BaseModel):
    id: str
    subject_id: str
    duration: int
    student_ids: List[str]
    student_count: int


class FacultyInput(BaseModel):
    id: str
    max_workload: int
    exam_ids: List[str]


class ConstraintsInput(BaseModel):
    max_exams_per_day_per_student: int = 2
    min_gap_hours: int = 2
    invigilator_ratio: int = 30
    preferred_time_slots: Optional[List[str]] = None
    avoid_consecutive_days: bool = True


class TimetableGenerationRequest(BaseModel):
    period: Dict[str, str]
    time_slots: List[TimeSlot]
    rooms: List[RoomInput]
    exams: List[ExamInput]
    faculty: List[FacultyInput]
    constraints: Optional[ConstraintsInput] = None


class RoomLayoutInput(BaseModel):
    id: str
    capacity: int
    rows: int
    columns: int
    layout: Optional[Dict[str, Any]] = None


class StudentInfo(BaseModel):
    id: str
    department_id: str
    section: Optional[str] = None


class AntiCheatingRules(BaseModel):
    separate_same_subject: bool = True
    separate_same_section: bool = True
    separate_same_department: bool = False
    min_column_gap: int = 1


class SeatAllocationRequest(BaseModel):
    timetable_entries: List[Dict[str, Any]]
    rooms: List[RoomLayoutInput]
    students_by_exam: Dict[str, List[StudentInfo]]
    anti_cheating_rules: Optional[AntiCheatingRules] = None


class ExamSessionInput(BaseModel):
    exam_id: str
    room_id: str
    date: str
    start_time: str
    end_time: str
    student_count: int


class FacultyInfo(BaseModel):
    id: str
    max_workload: int


class InvigilatorAllocationRequest(BaseModel):
    exam_sessions: List[ExamSessionInput]
    faculty: List[FacultyInfo]
    invigilator_ratio: int
    include_relievers: bool = True
    reliever_percentage: int = 10


class ConflictDetectionRequest(BaseModel):
    timetable_entries: List[Dict[str, Any]]
    exams: List[Dict[str, Any]]
    rooms: List[Dict[str, Any]]
    faculty: List[Dict[str, Any]]