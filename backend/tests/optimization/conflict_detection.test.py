import pytest
from optimization.conflict_detection.detector import ConflictDetector
from optimization.models.request import ConflictDetectionRequest


class TestConflictDetector:
    @pytest.fixture
    def detector(self):
        return ConflictDetector()

    def test_detector_initialization(self, detector):
        assert detector is not None

    def test_detect_student_time_conflict(self, detector):
        request = ConflictDetectionRequest(
            timetable_entries=[
                {'id': 'TE1', 'exam_id': 'E1', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'},
                {'id': 'TE2', 'exam_id': 'E2', 'room_id': 'R2', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'},
            ],
            exams=[
                {'id': 'E1', 'student_ids': ['stu1'], 'faculty_ids': ['f1']},
                {'id': 'E2', 'student_ids': ['stu1'], 'faculty_ids': ['f2']},
            ],
            rooms=[{'id': 'R1', 'capacity': 60}, {'id': 'R2', 'capacity': 60}],
            faculty=[{'id': 'f1', 'max_workload': 4}, {'id': 'f2', 'max_workload': 4}],
        )
        
        result = detector.detect(request)
        student_conflicts = [c for c in result.conflicts if c.type == 'STUDENT_TIME_CONFLICT']
        assert len(student_conflicts) == 1
        assert student_conflicts[0].entity_id == 'stu1'

    def test_detect_room_double_booking(self, detector):
        request = ConflictDetectionRequest(
            timetable_entries=[
                {'id': 'TE1', 'exam_id': 'E1', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'},
                {'id': 'TE2', 'exam_id': 'E2', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'},
            ],
            exams=[
                {'id': 'E1', 'student_ids': ['stu1'], 'faculty_ids': ['f1']},
                {'id': 'E2', 'student_ids': ['stu2'], 'faculty_ids': ['f2']},
            ],
            rooms=[{'id': 'R1', 'capacity': 60}],
            faculty=[{'id': 'f1', 'max_workload': 4}, {'id': 'f2', 'max_workload': 4}],
        )
        
        result = detector.detect(request)
        room_conflicts = [c for c in result.conflicts if c.type == 'ROOM_DOUBLE_BOOKING']
        assert len(room_conflicts) == 1
        assert room_conflicts[0].entity_id == 'R1'

    def test_detect_faculty_double_booking(self, detector):
        request = ConflictDetectionRequest(
            timetable_entries=[
                {'id': 'TE1', 'exam_id': 'E1', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'},
                {'id': 'TE2', 'exam_id': 'E2', 'room_id': 'R2', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'},
            ],
            exams=[
                {'id': 'E1', 'student_ids': ['stu1'], 'faculty_ids': ['f1']},
                {'id': 'E2', 'student_ids': ['stu2'], 'faculty_ids': ['f1']},
            ],
            rooms=[{'id': 'R1', 'capacity': 60}, {'id': 'R2', 'capacity': 60}],
            faculty=[{'id': 'f1', 'max_workload': 4}],
        )
        
        result = detector.detect(request)
        faculty_conflicts = [c for c in result.conflicts if c.type == 'FACULTY_DOUBLE_BOOKING']
        assert len(faculty_conflicts) == 1
        assert faculty_conflicts[0].entity_id == 'f1'

    def test_detect_capacity_exceeded(self, detector):
        request = ConflictDetectionRequest(
            timetable_entries=[
                {'id': 'TE1', 'exam_id': 'E1', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'},
            ],
            exams=[
                {'id': 'E1', 'student_ids': ['stu1', 'stu2', 'stu3', 'stu4', 'stu5'], 'faculty_ids': ['f1']},
            ],
            rooms=[{'id': 'R1', 'capacity': 3}],
            faculty=[{'id': 'f1', 'max_workload': 4}],
        )
        
        result = detector.detect(request)
        capacity_conflicts = [c for c in result.conflicts if c.type == 'ROOM_CAPACITY_EXCEEDED']
        assert len(capacity_conflicts) == 1

    def test_no_conflicts_when_valid(self, detector):
        request = ConflictDetectionRequest(
            timetable_entries=[
                {'id': 'TE1', 'exam_id': 'E1', 'room_id': 'R1', 'date': '2026-01-15', 'start_time': '09:00', 'end_time': '12:00'},
                {'id': 'TE2', 'exam_id': 'E2', 'room_id': 'R2', 'date': '2026-01-15', 'start_time': '13:00', 'end_time': '16:00'},
            ],
            exams=[
                {'id': 'E1', 'student_ids': ['stu1'], 'faculty_ids': ['f1']},
                {'id': 'E2', 'student_ids': ['stu2'], 'faculty_ids': ['f2']},
            ],
            rooms=[{'id': 'R1', 'capacity': 60}, {'id': 'R2', 'capacity': 60}],
            faculty=[{'id': 'f1', 'max_workload': 4}, {'id': 'f2', 'max_workload': 4}],
        )
        
        result = detector.detect(request)
        assert len(result.conflicts) == 0