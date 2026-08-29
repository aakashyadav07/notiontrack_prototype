from ortools.sat.python import cp_model
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging

from models.request import TimetableGenerationRequest, TimeSlot, RoomInput, ExamInput, FacultyInput
from models.response import TimetableGenerationResponse, TimetableEntryOutput, TimetableStatistics, ConflictOutput

logger = logging.getLogger(__name__)


class TimetableSolver:
    def __init__(self):
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = 60.0
        self.solver.parameters.num_search_workers = 8
        self.solver.parameters.log_search_progress = True

    async def solve(self, request: TimetableGenerationRequest) -> TimetableGenerationResponse:
        start_time = datetime.now()
        
        time_slots = self._generate_time_slots(request.period, request.time_slots)
        exams = {e.id: e for e in request.exams}
        rooms = {r.id: r for r in request.rooms}
        faculty = {f.id: f for f in request.faculty}
        
        student_exams = self._build_student_exam_map(request.exams)
        faculty_exams = self._build_faculty_exam_map(request.faculty)
        
        x = {}
        for exam_id, exam in exams.items():
            for room_id, room in rooms.items():
                if exam.student_count > room.capacity:
                    continue
                for slot in time_slots:
                    if exam.duration <= self._slot_duration_minutes(slot):
                        x[(exam_id, room_id, slot['date'], slot['start'], slot['end'])] = self.model.NewBoolVar(
                            f"x_{exam_id}_{room_id}_{slot['date']}_{slot['start']}_{slot['end']}"
                        )
        
        if not x:
            return self._empty_response(start_time, "No valid exam-room-slot combinations")

        self._add_hard_constraints(x, exams, rooms, time_slots, student_exams, faculty_exams, request)
        self._add_soft_constraints(x, exams, rooms, time_slots, student_exams, faculty_exams, request)
        
        status = self.solver.Solve(self.model)
        
        if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return self._empty_response(start_time, "No feasible solution found")
        
        entries = self._extract_solution(x, exams, rooms, time_slots)
        conflicts = self._detect_conflicts(entries, exams, rooms, student_exams, faculty_exams)
        stats = self._calculate_statistics(entries, exams, rooms, time_slots, conflicts, start_time)
        
        return TimetableGenerationResponse(
            status="success" if len(conflicts) == 0 else "partial",
            entries=entries,
            statistics=stats,
            conflicts=conflicts if conflicts else None
        )

    def _generate_time_slots(self, period: Dict[str, str], slot_configs: List[TimeSlot]) -> List[Dict[str, Any]]:
        start = datetime.fromisoformat(period['start'])
        end = datetime.fromisoformat(period['end'])
        slots = []
        current = start
        while current <= end:
            for config in slot_configs:
                slots.append({
                    'date': current.strftime('%Y-%m-%d'),
                    'type': config.type,
                    'start': config.start,
                    'end': config.end,
                })
            current += timedelta(days=1)
        return slots

    def _slot_duration_minutes(self, slot: Dict[str, Any]) -> int:
        start = datetime.strptime(slot['start'], '%H:%M')
        end = datetime.strptime(slot['end'], '%H:%M')
        return int((end - start).total_seconds() / 60)

    def _build_student_exam_map(self, exams: List[ExamInput]) -> Dict[str, List[str]]:
        student_exams = {}
        for exam in exams:
            for student_id in exam.student_ids:
                if student_id not in student_exams:
                    student_exams[student_id] = []
                student_exams[student_id].append(exam.id)
        return student_exams

    def _build_faculty_exam_map(self, faculty: List[FacultyInput]) -> Dict[str, List[str]]:
        faculty_exams = {}
        for fac in faculty:
            for exam_id in fac.exam_ids:
                if fac.id not in faculty_exams:
                    faculty_exams[fac.id] = []
                faculty_exams[fac.id].append(exam_id)
        return faculty_exams

    def _add_hard_constraints(
        self,
        x: Dict,
        exams: Dict[str, ExamInput],
        rooms: Dict[str, RoomInput],
        time_slots: List[Dict[str, Any]],
        student_exams: Dict[str, List[str]],
        faculty_exams: Dict[str, List[str]],
        request: TimetableGenerationRequest,
    ):
        for exam_id in exams:
            exam_vars = [v for k, v in x.items() if k[0] == exam_id]
            if exam_vars:
                self.model.Add(sum(exam_vars) == 1)

        for room_id in rooms:
            for slot in time_slots:
                slot_vars = [v for k, v in x.items() if k[1] == room_id and k[2] == slot['date'] and k[3] == slot['start']]
                if slot_vars:
                    self.model.Add(sum(slot_vars) <= 1)

        for student_id, exam_ids in student_exams.items():
            for slot in time_slots:
                student_slot_vars = [
                    v for k, v in x.items() 
                    if k[0] in exam_ids and k[2] == slot['date'] and k[3] == slot['start']
                ]
                if student_slot_vars:
                    self.model.Add(sum(student_slot_vars) <= 1)

        for faculty_id, exam_ids in faculty_exams.items():
            for slot in time_slots:
                fac_slot_vars = [
                    v for k, v in x.items()
                    if k[0] in exam_ids and k[2] == slot['date'] and k[3] == slot['start']
                ]
                if fac_slot_vars:
                    self.model.Add(sum(fac_slot_vars) <= 1)

    def _add_soft_constraints(
        self,
        x: Dict,
        exams: Dict[str, ExamInput],
        rooms: Dict[str, RoomInput],
        time_slots: List[Dict[str, Any]],
        student_exams: Dict[str, List[str]],
        faculty_exams: Dict[str, List[str]],
        request: TimetableGenerationRequest,
    ):
        penalties = []
        
        if request.constraints:
            constraints = request.constraints
            
            if constraints.max_exams_per_day_per_student:
                for student_id, exam_ids in student_exams.items():
                    dates = set(slot['date'] for slot in time_slots)
                    for date in dates:
                        day_vars = [
                            v for k, v in x.items()
                            if k[0] in exam_ids and k[2] == date
                        ]
                        if day_vars:
                            over = self.model.NewIntVar(0, len(day_vars), f"over_{student_id}_{date}")
                            self.model.Add(sum(day_vars) - constraints.max_exams_per_day_per_student <= over)
                            penalties.append(over * 10)
            
            if constraints.min_gap_hours:
                for student_id, exam_ids in student_exams.items():
                    for slot in time_slots:
                        slot_start = datetime.strptime(slot['start'], '%H:%M')
                        for other_slot in time_slots:
                            if other_slot['date'] == slot['date'] and other_slot['start'] != slot['start']:
                                other_start = datetime.strptime(other_slot['start'], '%H:%M')
                                gap = abs((other_start - slot_start).total_seconds() / 3600)
                                if 0 < gap < constraints.min_gap_hours:
                                    conflict_vars = [
                                        v for k, v in x.items()
                                        if k[0] in exam_ids and k[2] == slot['date'] and 
                                        (k[3] == slot['start'] or k[3] == other_slot['start'])
                                    ]
                                    if len(conflict_vars) >= 2:
                                        penalty = self.model.NewBoolVar(f"gap_penalty_{student_id}_{slot['date']}_{slot['start']}_{other_slot['start']}")
                                        self.model.Add(sum(conflict_vars) >= 2).OnlyEnforceIf(penalty)
                                        self.model.Add(sum(conflict_vars) <= 1).OnlyEnforceIf(penalty.Not())
                                        penalties.append(penalty * 5)

            for exam_id, exam in exams.items():
                for room_id, room in rooms.items():
                    for slot in time_slots:
                        if (exam_id, room_id, slot['date'], slot['start'], slot['end']) in x:
                            waste = room.capacity - exam.student_count
                            if waste > 0:
                                waste_penalty = waste * 0.1
                                penalties.append(x[(exam_id, room_id, slot['date'], slot['start'], slot['end'])] * int(waste_penalty))
        
        if penalties:
            self.model.Minimize(sum(penalties))

    def _extract_solution(
        self,
        x: Dict,
        exams: Dict[str, ExamInput],
        rooms: Dict[str, RoomInput],
        time_slots: List[Dict[str, Any]],
    ) -> List[TimetableEntryOutput]:
        entries = []
        for (exam_id, room_id, date, start, end), var in x.items():
            if self.solver.Value(var) == 1:
                entries.append(TimetableEntryOutput(
                    exam_id=exam_id,
                    room_id=room_id,
                    date=date,
                    start_time=start,
                    end_time=end,
                ))
        return entries

    def _detect_conflicts(
        self,
        entries: List[TimetableEntryOutput],
        exams: Dict[str, ExamInput],
        rooms: Dict[str, RoomInput],
        student_exams: Dict[str, List[str]],
        faculty_exams: Dict[str, List[str]],
    ) -> List[ConflictOutput]:
        conflicts = []
        
        for student_id, exam_ids in student_exams.items():
            student_entries = [e for e in entries if e.exam_id in exam_ids]
            for i, e1 in enumerate(student_entries):
                for e2 in student_entries[i+1:]:
                    if e1.date == e2.date and e1.start_time == e2.start_time:
                        conflicts.append(ConflictOutput(
                            type="STUDENT_TIME_CONFLICT",
                            severity="HIGH",
                            description=f"Student {student_id} has two exams at the same time",
                            entity_type="Student",
                            entity_id=student_id,
                            related_entity_type="Exam",
                            related_entity_id=f"{e1.exam_id},{e2.exam_id}",
                        ))
        
        room_slots = {}
        for e in entries:
            key = (e.room_id, e.date, e.start_time)
            if key not in room_slots:
                room_slots[key] = []
            room_slots[key].append(e)
        
        for (room_id, date, start), es in room_slots.items():
            if len(es) > 1:
                conflicts.append(ConflictOutput(
                    type="ROOM_DOUBLE_BOOKING",
                    severity="HIGH",
                    description=f"Room {room_id} has multiple exams at the same time",
                    entity_type="Room",
                    entity_id=room_id,
                    related_entity_type="Exam",
                    related_entity_id=",".join(e.exam_id for e in es),
                ))
        
        for fac_id, exam_ids in faculty_exams.items():
            fac_entries = [e for e in entries if e.exam_id in exam_ids]
            for i, e1 in enumerate(fac_entries):
                for e2 in fac_entries[i+1:]:
                    if e1.date == e2.date and e1.start_time == e2.start_time:
                        conflicts.append(ConflictOutput(
                            type="FACULTY_DOUBLE_BOOKING",
                            severity="HIGH",
                            description=f"Faculty {fac_id} assigned to two exams at the same time",
                            entity_type="Faculty",
                            entity_id=fac_id,
                            related_entity_type="Exam",
                            related_entity_id=f"{e1.exam_id},{e2.exam_id}",
                        ))
        
        return conflicts

    def _calculate_statistics(
        self,
        entries: List[TimetableEntryOutput],
        exams: Dict[str, ExamInput],
        rooms: Dict[str, RoomInput],
        time_slots: List[Dict[str, Any]],
        conflicts: List[ConflictOutput],
        start_time: datetime,
    ) -> TimetableStatistics:
        exams_scheduled = len(set(e.exam_id for e in entries))
        rooms_used = len(set(e.room_id for e in entries))
        
        room_usage = {}
        for e in entries:
            if e.room_id not in room_usage:
                room_usage[e.room_id] = []
            room_usage[e.room_id].append(e)
        
        total_utilization = 0
        for room_id, room_entries in room_usage.items():
            room = rooms.get(room_id)
            if room:
                total_students = sum(exams[e.exam_id].student_count for e in room_entries if e.exam_id in exams)
                total_capacity = room.capacity * len(room_entries)
                if total_capacity > 0:
                    total_utilization += total_students / total_capacity
        
        avg_utilization = (total_utilization / rooms_used * 100) if rooms_used > 0 else 0
        
        unique_students = set()
        for e in entries:
            exam = exams.get(e.exam_id)
            if exam:
                unique_students.update(exam.student_ids)
        
        generation_time = (datetime.now() - start_time).total_seconds()
        
        return TimetableStatistics(
            exams_scheduled=exams_scheduled,
            conflicts_detected=len(conflicts),
            conflicts_resolved=0,
            remaining_conflicts=len(conflicts),
            room_utilization=round(avg_utilization, 1),
            rooms_used=rooms_used,
            students_affected=len(unique_students),
            invigilators_assigned=0,
            optimization_score=max(0, 100 - len(conflicts) * 5),
            generation_time=round(generation_time, 1),
        )

    def _empty_response(self, start_time: datetime, message: str) -> TimetableGenerationResponse:
        return TimetableGenerationResponse(
            status="failed",
            entries=[],
            statistics=TimetableStatistics(
                exams_scheduled=0,
                conflicts_detected=0,
                conflicts_resolved=0,
                remaining_conflicts=0,
                room_utilization=0,
                rooms_used=0,
                students_affected=0,
                invigilators_assigned=0,
                optimization_score=0,
                generation_time=round((datetime.now() - start_time).total_seconds(), 1),
            ),
            conflicts=[ConflictOutput(
                type="NO_FEASIBLE_SOLUTION",
                severity="CRITICAL",
                description=message,
                entity_type="System",
                entity_id="solver",
            )],
        )