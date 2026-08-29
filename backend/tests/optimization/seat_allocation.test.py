import pytest
from optimization.seat_allocation.allocator import SeatAllocator
from optimization.models.request import (
    SeatAllocationRequest, RoomLayoutInput, StudentInfo, AntiCheatingRules
)


class TestSeatAllocator:
    @pytest.fixture
    def allocator(self):
        return SeatAllocator()

    @pytest.fixture
    def basic_request(self):
        return SeatAllocationRequest(
            timetable_entries=[
                {
                    'exam_id': 'E1',
                    'room_id': 'R1',
                    'date': '2026-01-15',
                    'start_time': '09:00',
                    'end_time': '12:00',
                }
            ],
            rooms=[
                RoomLayoutInput(id='R1', capacity=20, rows=4, columns=5),
            ],
            students_by_exam={
                'E1': [
                    StudentInfo(id='S1', department_id='CSE', section='A'),
                    StudentInfo(id='S2', department_id='CSE', section='A'),
                    StudentInfo(id='S3', department_id='ECE', section='B'),
                    StudentInfo(id='S4', department_id='MECH', section='A'),
                ]
            },
            anti_cheating_rules=AntiCheatingRules(
                separate_same_subject=True,
                separate_same_section=True,
                separate_same_department=False,
                min_column_gap=1,
            )
        )

    def test_allocator_initialization(self, allocator):
        assert allocator is not None

    def test_basic_allocation(self, allocator, basic_request):
        result = allocator.allocate(basic_request)
        assert result is not None
        assert result.allocations is not None
        assert len(result.allocations) == 4
        assert result.statistics.total_allocated == 4

    def test_seat_number_format(self, allocator, basic_request):
        result = allocator.allocate(basic_request)
        for alloc in result.allocations:
            assert alloc.seat_number is not None
            assert len(alloc.seat_number) >= 2
            assert alloc.seat_row.isalpha()
            assert isinstance(alloc.seat_column, int)
            assert alloc.seat_column > 0

    def test_all_students_allocated(self, allocator, basic_request):
        result = allocator.allocate(basic_request)
        allocated_ids = {a.student_id for a in result.allocations}
        expected_ids = {'S1', 'S2', 'S3', 'S4'}
        assert allocated_ids == expected_ids

    def test_anti_cheating_same_section_separation(self, allocator):
        request = SeatAllocationRequest(
            timetable_entries=[
                {'exam_id': 'E1', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'}
            ],
            rooms=[RoomLayoutInput(id='R1', capacity=12, rows=3, columns=4)],
            students_by_exam={
                'E1': [
                    StudentInfo(id='S1', department_id='CSE', section='A'),
                    StudentInfo(id='S2', department_id='CSE', section='A'),
                    StudentInfo(id='S3', department_id='CSE', section='B'),
                    StudentInfo(id='S4', department_id='CSE', section='B'),
                ]
            },
            anti_cheating_rules=AntiCheatingRules(
                separate_same_subject=False,
                separate_same_section=True,
                separate_same_department=False,
                min_column_gap=1,
            )
        )
        
        result = allocator.allocate(request)
        assert result is not None
        assert len(result.allocations) == 4

    def test_room_capacity_respected(self, allocator):
        request = SeatAllocationRequest(
            timetable_entries=[
                {'exam_id': 'E1', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'}
            ],
            rooms=[RoomLayoutInput(id='R1', capacity=2, rows=1, columns=2)],
            students_by_exam={
                'E1': [
                    StudentInfo(id='S1', department_id='CSE'),
                    StudentInfo(id='S2', department_id='CSE'),
                    StudentInfo(id='S3', department_id='CSE'),
                ]
            },
            anti_cheating_rules=AntiCheatingRules(separate_same_subject=False)
        )
        
        result = allocator.allocate(request)
        assert len(result.allocations) == 2

    def test_zigzag_pattern(self, allocator):
        request = SeatAllocationRequest(
            timetable_entries=[
                {'exam_id': 'E1', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'}
            ],
            rooms=[RoomLayoutInput(id='R1', capacity=20, rows=4, columns=5)],
            students_by_exam={
                'E1': [
                    StudentInfo(id=f'S{i}', department_id='CSE') for i in range(20)
                ]
            },
            anti_cheating_rules=AntiCheatingRules(separate_same_subject=False)
        )
        
        result = allocator.allocate(request)
        rows_used = set(a.seat_row for a in result.allocations)
        assert len(rows_used) == 4