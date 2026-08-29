import pytest
from datetime import datetime, timedelta
from optimization.timetable.solver import TimetableSolver
from optimization.models.request import (
    TimetableGenerationRequest, TimeSlot, RoomInput, ExamInput, FacultyInput, ConstraintsInput
)


class TestTimetableSolver:
    @pytest.fixture
    def solver(self):
        return TimetableSolver()

    @pytest.fixture
    def basic_request(self):
        start_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
        
        return TimetableGenerationRequest(
            period={'start': start_date, 'end': end_date},
            time_slots=[
                TimeSlot(type='MORNING', start='09:00', end='12:00'),
                TimeSlot(type='AFTERNOON', start='13:00', end='16:00'),
            ],
            rooms=[
                RoomInput(id='R1', capacity=60),
                RoomInput(id='R2', capacity=50),
                RoomInput(id='R3', capacity=40),
            ],
            exams=[
                ExamInput(id='E1', subject_id='S1', duration=180, student_ids=['stu1', 'stu2'], student_count=2),
                ExamInput(id='E2', subject_id='S2', duration=180, student_ids=['stu3', 'stu4'], student_count=2),
                ExamInput(id='E3', subject_id='S3', duration=180, student_ids=['stu1', 'stu3'], student_count=2),
            ],
            faculty=[
                FacultyInput(id='F1', max_workload=4, exam_ids=['E1', 'E2']),
                FacultyInput(id='F2', max_workload=4, exam_ids=['E3']),
            ],
            constraints=ConstraintsInput(
                max_exams_per_day_per_student=2,
                min_gap_hours=2,
                invigilator_ratio=30,
            )
        )

    def test_solver_initialization(self, solver):
        assert solver is not None
        assert solver.model is not None
        assert solver.solver is not None

    def test_generate_time_slots(self, solver, basic_request):
        slots = solver._generate_time_slots(basic_request.period, basic_request.time_slots)
        assert len(slots) > 0
        assert all('date' in s and 'type' in s and 'start' in s and 'end' in s for s in slots)

    def test_slot_duration(self, solver):
        slot = {'start': '09:00', 'end': '12:00'}
        duration = solver._slot_duration_minutes(slot)
        assert duration == 180

    def test_build_student_exam_map(self, solver, basic_request):
        student_exams = solver._build_student_exam_map(basic_request.exams)
        assert 'stu1' in student_exams
        assert len(student_exams['stu1']) == 2  # E1 and E3

    def test_build_faculty_exam_map(self, solver, basic_request):
        faculty_exams = solver._build_faculty_exam_map(basic_request.faculty)
        assert 'F1' in faculty_exams
        assert len(faculty_exams['F1']) == 2  # E1 and E2

    @pytest.mark.asyncio
    async def test_solve_basic(self, solver, basic_request):
        result = await solver.solve(basic_request)
        assert result is not None
        assert result.status in ['success', 'partial', 'failed']
        assert result.entries is not None
        assert result.statistics is not None

    @pytest.mark.asyncio
    async def test_student_conflict_prevention(self, solver):
        start_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
        
        request = TimetableGenerationRequest(
            period={'start': start_date, 'end': end_date},
            time_slots=[
                TimeSlot(type='MORNING', start='09:00', end='12:00'),
            ],
            rooms=[
                RoomInput(id='R1', capacity=60),
            ],
            exams=[
                ExamInput(id='E1', subject_id='S1', duration=180, student_ids=['stu1'], student_count=1),
                ExamInput(id='E2', subject_id='S2', duration=180, student_ids=['stu1'], student_count=1),
            ],
            faculty=[
                FacultyInput(id='F1', max_workload=4, exam_ids=['E1']),
                FacultyInput(id='F2', max_workload=4, exam_ids=['E2']),
            ],
            constraints=ConstraintsInput(max_exams_per_day_per_student=1, min_gap_hours=0)
        )
        
        result = await solver.solve(request)
        if result.status == 'success':
            student_entries = [e for e in result.entries if e.exam_id in ['E1', 'E2']]
            assert len(student_entries) == 2
            assert student_entries[0].date != student_entries[1].date or student_entries[0].start_time != student_entries[1].start_time

    @pytest.mark.asyncio
    async def test_room_capacity_constraint(self, solver):
        start_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
        
        request = TimetableGenerationRequest(
            period={'start': start_date, 'end': end_date},
            time_slots=[
                TimeSlot(type='MORNING', start='09:00', end='12:00'),
            ],
            rooms=[
                RoomInput(id='R1', capacity=2),
            ],
            exams=[
                ExamInput(id='E1', subject_id='S1', duration=180, student_ids=['stu1', 'stu2', 'stu3'], student_count=3),
            ],
            faculty=[
                FacultyInput(id='F1', max_workload=4, exam_ids=['E1']),
            ],
        )
        
        result = await solver.solve(request)
        assert result.status == 'failed' or result.statistics.exams_scheduled == 0

    @pytest.mark.asyncio
    async def test_room_double_booking_prevention(self, solver):
        start_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
        
        request = TimetableGenerationRequest(
            period={'start': start_date, 'end': end_date},
            time_slots=[
                TimeSlot(type='MORNING', start='09:00', end='12:00'),
            ],
            rooms=[
                RoomInput(id='R1', capacity=60),
            ],
            exams=[
                ExamInput(id='E1', subject_id='S1', duration=180, student_ids=['stu1'], student_count=1),
                ExamInput(id='E2', subject_id='S2', duration=180, student_ids=['stu2'], student_count=1),
            ],
            faculty=[
                FacultyInput(id='F1', max_workload=4, exam_ids=['E1']),
                FacultyInput(id='F2', max_workload=4, exam_ids=['E2']),
            ],
        )
        
        result = await solver.solve(request)
        if result.status == 'success':
            e1 = next(e for e in result.entries if e.exam_id == 'E1')
            e2 = next(e for e in result.entries if e.exam_id == 'E2')
            assert e1.date != e2.date or e1.start_time != e2.start_time

    @pytest.mark.asyncio
    async def test_faculty_conflict_prevention(self, solver):
        start_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
        
        request = TimetableGenerationRequest(
            period={'start': start_date, 'end': end_date},
            time_slots=[
                TimeSlot(type='MORNING', start='09:00', end='12:00'),
            ],
            rooms=[
                RoomInput(id='R1', capacity=60),
                RoomInput(id='R2', capacity=60),
            ],
            exams=[
                ExamInput(id='E1', subject_id='S1', duration=180, student_ids=['stu1'], student_count=1),
                ExamInput(id='E2', subject_id='S2', duration=180, student_ids=['stu2'], student_count=1),
            ],
            faculty=[
                FacultyInput(id='F1', max_workload=4, exam_ids=['E1', 'E2']),
            ],
        )
        
        result = await solver.solve(request)
        if result.status == 'success':
            e1 = next(e for e in result.entries if e.exam_id == 'E1')
            e2 = next(e for e in result.entries if e.exam_id == 'E2')
            assert e1.date != e2.date or e1.start_time != e2.start_time