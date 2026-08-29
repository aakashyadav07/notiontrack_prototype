from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from models.request import SeatAllocationRequest, RoomLayoutInput, StudentInfo, AntiCheatingRules
from models.response import SeatAllocationResponse, SeatAllocationOutput, SeatAllocationStatistics


class SeatAllocator:
    def allocate(self, request: SeatAllocationRequest) -> SeatAllocationResponse:
        rules = request.anti_cheating_rules or AntiCheatingRules()
        
        room_layouts = {room.id: room for room in request.rooms}
        
        allocations = []
        
        for entry in request.timetable_entries:
            exam_id = entry['exam_id']
            room_id = entry['room_id']
            
            if room_id not in room_layouts:
                continue
            
            room = room_layouts[room_id]
            students = request.students_by_exam.get(exam_id, [])
            
            if not students:
                continue
            
            seat_assignments = self._assign_seats(room, students, rules)
            allocations.extend(seat_assignments)
        
        stats = self._calculate_statistics(allocations, room_layouts, rules)
        
        return SeatAllocationResponse(allocations=allocations, statistics=stats)

    def _assign_seats(
        self,
        room: RoomLayoutInput,
        students: List[StudentInfo],
        rules: AntiCheatingRules,
    ) -> List[SeatAllocationOutput]:
        rows = room.rows
        cols = room.columns
        
        seat_grid = [[None for _ in range(cols)] for _ in range(rows)]
        assignments = []
        
        sorted_students = self._sort_students_for_anti_cheating(students, rules)
        
        row_order = list(range(rows))
        if rules.separate_same_department:
            row_order = row_order[::2] + row_order[1::2]
        
        seat_index = 0
        for student in sorted_students:
            placed = False
            
            for row_idx in row_order:
                for col_idx in range(cols):
                    if seat_grid[row_idx][col_idx] is None:
                        if self._is_valid_seat(seat_grid, row_idx, col_idx, student, sorted_students[:seat_index], rules):
                            seat_grid[row_idx][col_idx] = student
                            row_letter = chr(ord('A') + row_idx)
                            seat_number = f"{row_letter}{col_idx + 1}"
                            assignments.append(SeatAllocationOutput(
                                student_id=student.id,
                                exam_id="",  # Will be set by caller
                                room_id=room.id,
                                seat_row=row_letter,
                                seat_column=col_idx + 1,
                                seat_number=seat_number,
                            ))
                            placed = True
                            break
                if placed:
                    break
            
            if not placed:
                for row_idx in range(rows):
                    for col_idx in range(cols):
                        if seat_grid[row_idx][col_idx] is None:
                            seat_grid[row_idx][col_idx] = student
                            row_letter = chr(ord('A') + row_idx)
                            seat_number = f"{row_letter}{col_idx + 1}"
                            assignments.append(SeatAllocationOutput(
                                student_id=student.id,
                                exam_id="",
                                room_id=room.id,
                                seat_row=row_letter,
                                seat_column=col_idx + 1,
                                seat_number=seat_number,
                            ))
                            placed = True
                            break
                    if placed:
                        break
            
            seat_index += 1
        
        for assignment in assignments:
            assignment.exam_id = students[0].id if students else ""
        
        return assignments

    def _sort_students_for_anti_cheating(
        self,
        students: List[StudentInfo],
        rules: AntiCheatingRules,
    ) -> List[StudentInfo]:
        dept_groups = defaultdict(list)
        section_groups = defaultdict(list)
        
        for student in students:
            dept_groups[student.department_id].append(student)
            if student.section:
                section_groups[student.section].append(student)
        
        sorted_students = []
        dept_items = list(dept_groups.items())
        
        for i, (dept, dept_students) in enumerate(dept_items):
            if rules.separate_same_section:
                dept_students.sort(key=lambda s: s.section or '')
            
            if i % 2 == 0:
                sorted_students.extend(dept_students)
            else:
                sorted_students.extend(reversed(dept_students))
        
        return sorted_students

    def _is_valid_seat(
        self,
        seat_grid: List[List[Optional[StudentInfo]]],
        row: int,
        col: int,
        student: StudentInfo,
        placed_students: List[StudentInfo],
        rules: AntiCheatingRules,
    ) -> bool:
        if rules.separate_same_subject:
            for dc in [-1, 1]:
                nc = col + dc
                if 0 <= nc < len(seat_grid[0]) and seat_grid[row][nc] is not None:
                    neighbor = seat_grid[row][nc]
                    pass
        
        if rules.separate_same_section and student.section:
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = row + dr, col + dc
                    if 0 <= nr < len(seat_grid) and 0 <= nc < len(seat_grid[0]):
                        neighbor = seat_grid[nr][nc]
                        if neighbor and neighbor.section == student.section:
                            return False
        
        if rules.separate_same_department:
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = row + dr, col + dc
                    if 0 <= nr < len(seat_grid) and 0 <= nc < len(seat_grid[0]):
                        neighbor = seat_grid[nr][nc]
                        if neighbor and neighbor.department_id == student.department_id:
                            if abs(dc) < rules.min_column_gap:
                                return False
        
        return True

    def _calculate_statistics(
        self,
        allocations: List[SeatAllocationOutput],
        room_layouts: Dict[str, RoomLayoutInput],
        rules: AntiCheatingRules,
    ) -> SeatAllocationStatistics:
        rooms_used = len(set(a.room_id for a in allocations))
        total_allocated = len(allocations)
        
        violations = 0
        if rules.separate_same_section or rules.separate_same_department:
            room_students = defaultdict(list)
            for a in allocations:
                room_students[a.room_id].append(a)
            
            for room_id, room_allocations in room_students.items():
                room = room_layouts.get(room_id)
                if not room:
                    continue
                
                grid = [[None for _ in range(room.columns)] for _ in range(room.rows)]
                for a in room_allocations:
                    row_idx = ord(a.seat_row) - ord('A')
                    col_idx = a.seat_column - 1
                    if 0 <= row_idx < room.rows and 0 <= col_idx < room.columns:
                        grid[row_idx][col_idx] = a
                
                for a in room_allocations:
                    row_idx = ord(a.seat_row) - ord('A')
                    col_idx = a.seat_column - 1
                    
                    if rules.separate_same_section:
                        for dr in [-1, 0, 1]:
                            for dc in [-1, 0, 1]:
                                if dr == 0 and dc == 0:
                                    continue
                                nr, nc = row_idx + dr, col_idx + dc
                                if 0 <= nr < room.rows and 0 <= nc < room.columns:
                                    neighbor = grid[nr][nc]
                                    if neighbor and neighbor.seat_row == a.seat_row:
                                        pass
        
        return SeatAllocationStatistics(
            total_allocated=total_allocated,
            rooms_used=rooms_used,
            anti_cheating_violations=violations,
        )