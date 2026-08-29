from typing import List, Dict, Any
from collections import defaultdict

from models.request import ConflictDetectionRequest
from models.response import ConflictDetectionResponse, ConflictOutput


class ConflictDetector:
    def detect(self, request: ConflictDetectionRequest) -> ConflictDetectionResponse:
        conflicts = []
        
        conflicts.extend(self._detect_student_conflicts(request))
        conflicts.extend(self._detect_room_conflicts(request))
        conflicts.extend(self._detect_faculty_conflicts(request))
        conflicts.extend(self._detect_capacity_conflicts(request))
        conflicts.extend(self._detect_missing_assignments(request))
        conflicts.extend(self._detect_invalid_slots(request))
        
        return ConflictDetectionResponse(conflicts=conflicts)

    def _detect_student_conflicts(self, request: ConflictDetectionRequest) -> List[ConflictOutput]:
        conflicts = []
        student_schedule = defaultdict(list)
        
        exam_students = {}
        for exam in request.exams:
            exam_students[exam['id']] = exam.get('student_ids', [])
        
        for entry in request.timetable_entries:
            exam_id = entry['exam_id']
            for student_id in exam_students.get(exam_id, []):
                key = (student_id, entry['date'], entry['start_time'])
                student_schedule[key].append(entry)
        
        for (student_id, date, start_time), entries in student_schedule.items():
            if len(entries) > 1:
                exam_ids = [e['exam_id'] for e in entries]
                conflicts.append(ConflictOutput(
                    type="STUDENT_TIME_CONFLICT",
                    severity="HIGH",
                    description=f"Student {student_id} has {len(entries)} exams at the same time on {date} {start_time}",
                    entity_type="Student",
                    entity_id=student_id,
                    related_entity_type="Exam",
                    related_entity_id=",".join(exam_ids),
                ))
        
        return conflicts

    def _detect_room_conflicts(self, request: ConflictDetectionRequest) -> List[ConflictOutput]:
        conflicts = []
        room_schedule = defaultdict(list)
        
        for entry in request.timetable_entries:
            key = (entry['room_id'], entry['date'], entry['start_time'])
            room_schedule[key].append(entry)
        
        for (room_id, date, start_time), entries in room_schedule.items():
            if len(entries) > 1:
                exam_ids = [e['exam_id'] for e in entries]
                conflicts.append(ConflictOutput(
                    type="ROOM_DOUBLE_BOOKING",
                    severity="HIGH",
                    description=f"Room {room_id} has {len(entries)} exams scheduled at {date} {start_time}",
                    entity_type="Room",
                    entity_id=room_id,
                    related_entity_type="Exam",
                    related_entity_id=",".join(exam_ids),
                ))
        
        return conflicts

    def _detect_faculty_conflicts(self, request: ConflictDetectionRequest) -> List[ConflictOutput]:
        conflicts = []
        faculty_schedule = defaultdict(list)
        
        exam_faculty = {}
        for exam in request.exams:
            exam_faculty[exam['id']] = exam.get('faculty_ids', [])
        
        for entry in request.timetable_entries:
            exam_id = entry['exam_id']
            for fac_id in exam_faculty.get(exam_id, []):
                key = (fac_id, entry['date'], entry['start_time'])
                faculty_schedule[key].append(entry)
        
        for (fac_id, date, start_time), entries in faculty_schedule.items():
            if len(entries) > 1:
                exam_ids = [e['exam_id'] for e in entries]
                conflicts.append(ConflictOutput(
                    type="FACULTY_DOUBLE_BOOKING",
                    severity="HIGH",
                    description=f"Faculty {fac_id} assigned to {len(entries)} exams at {date} {start_time}",
                    entity_type="Faculty",
                    entity_id=fac_id,
                    related_entity_type="Exam",
                    related_entity_id=",".join(exam_ids),
                ))
        
        return conflicts

    def _detect_capacity_conflicts(self, request: ConflictDetectionRequest) -> List[ConflictOutput]:
        conflicts = []
        room_capacities = {r['id']: r['capacity'] for r in request.rooms}
        
        exam_students = {}
        for exam in request.exams:
            exam_students[exam['id']] = len(exam.get('student_ids', []))
        
        for entry in request.timetable_entries:
            room_id = entry['room_id']
            exam_id = entry['exam_id']
            
            capacity = room_capacities.get(room_id, 0)
            student_count = exam_students.get(exam_id, 0)
            
            if student_count > capacity:
                conflicts.append(ConflictOutput(
                    type="ROOM_CAPACITY_EXCEEDED",
                    severity="HIGH",
                    description=f"Room {room_id} capacity ({capacity}) exceeded by exam {exam_id} ({student_count} students)",
                    entity_type="Room",
                    entity_id=room_id,
                    related_entity_type="Exam",
                    related_entity_id=exam_id,
                ))
        
        return conflicts

    def _detect_missing_assignments(self, request: ConflictDetectionRequest) -> List[ConflictOutput]:
        conflicts = []
        
        for entry in request.timetable_entries:
            if not entry.get('room_id'):
                conflicts.append(ConflictOutput(
                    type="MISSING_ROOM",
                    severity="CRITICAL",
                    description=f"Exam {entry['exam_id']} has no room assigned",
                    entity_type="Exam",
                    entity_id=entry['exam_id'],
                ))
        
        exam_faculty = {}
        for exam in request.exams:
            exam_faculty[exam['id']] = exam.get('faculty_ids', [])
        
        for entry in request.timetable_entries:
            exam_id = entry['exam_id']
            if not exam_faculty.get(exam_id):
                conflicts.append(ConflictOutput(
                    type="MISSING_INVIGILATOR",
                    severity="MEDIUM",
                    description=f"Exam {exam_id} has no invigilator assigned",
                    entity_type="Exam",
                    entity_id=exam_id,
                ))
        
        return conflicts

    def _detect_invalid_slots(self, request: ConflictDetectionRequest) -> List[ConflictOutput]:
        conflicts = []
        
        valid_slots = set()
        for entry in request.timetable_entries:
            key = (entry['date'], entry['start_time'], entry['end_time'])
            valid_slots.add(key)
        
        for entry in request.timetable_entries:
            key = (entry['date'], entry['start_time'], entry['end_time'])
            if key not in valid_slots:
                conflicts.append(ConflictOutput(
                    type="INVALID_TIME_SLOT",
                    severity="MEDIUM",
                    description=f"Exam {entry['exam_id']} scheduled in invalid time slot",
                    entity_type="Exam",
                    entity_id=entry['exam_id'],
                ))
        
        return conflicts