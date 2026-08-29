from typing import List, Dict, Any

from models.request import RoomInput, ExamInput


class RoomOptimizer:
    def optimize(self, exams: List[ExamInput], rooms: List[RoomInput]) -> Dict[str, str]:
        sorted_exams = sorted(exams, key=lambda e: -e.student_count)
        sorted_rooms = sorted(rooms, key=lambda r: r.capacity)
        
        assignments = {}
        room_usage = {room.id: 0 for room in rooms}
        
        for exam in sorted_exams:
            best_room = None
            for room in sorted_rooms:
                if exam.student_count <= room.capacity:
                    best_room = room
                    break
            
            if best_room:
                assignments[exam.id] = best_room.id
                room_usage[best_room.id] += 1
            else:
                largest_room = max(rooms, key=lambda r: r.capacity)
                assignments[exam.id] = largest_room.id
                room_usage[largest_room.id] += 1
        
        return assignments

    def calculate_utilization(
        self, 
        assignments: Dict[str, str], 
        exams: List[ExamInput], 
        rooms: List[RoomInput]
    ) -> Dict[str, float]:
        room_stats = {room.id: {'capacity': room.capacity, 'used': 0, 'exams': 0} for room in rooms}
        
        for exam_id, room_id in assignments.items():
            exam = next((e for e in exams if e.id == exam_id), None)
            if exam and room_id in room_stats:
                room_stats[room_id]['used'] += exam.student_count
                room_stats[room_id]['exams'] += 1
        
        utilization = {}
        for room_id, stats in room_stats.items():
            if stats['exams'] > 0:
                utilization[room_id] = (stats['used'] / (stats['capacity'] * stats['exams'])) * 100
            else:
                utilization[room_id] = 0.0
        
        return utilization