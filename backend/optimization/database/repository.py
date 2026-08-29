import asyncpg
from typing import List, Dict, Any, Optional
from datetime import datetime
import os


class DatabaseRepository:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.database_url = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/timetable_db"
        )

    async def connect(self):
        self.pool = await asyncpg.create_pool(self.database_url, min_size=2, max_size=10)

    async def close(self):
        if self.pool:
            await self.pool.close()

    async def get_rooms(self) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT r.id, r.code, r.name, r.capacity, r.building, r.floor,
                       sl.rows, sl.columns, sl.layout
                FROM rooms r
                LEFT JOIN seat_layouts sl ON r.id = sl.room_id
                WHERE r.is_active = true
                ORDER BY r.capacity
            """)
            return [dict(row) for row in rows]

    async def get_exams_with_students(self) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT e.id, e.subject_id, e.duration, e.exam_type, e.max_students,
                       json_agg(json_build_object(
                           'id', s.id,
                           'student_id', s.student_id,
                           'department_id', s.department_id,
                           'section', s.section
                       )) FILTER (WHERE s.id IS NOT NULL) as students
                FROM exams e
                LEFT JOIN exam_registrations er ON e.id = er.exam_id AND er.status = 'REGISTERED'
                LEFT JOIN students s ON er.student_id = s.id
                WHERE e.status IN ('DRAFT', 'SCHEDULED')
                GROUP BY e.id
            """)
            return [dict(row) for row in rows]

    async def get_faculty(self) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT f.id, f.employee_id, f.max_workload, f.department_id,
                       json_agg(e.id) FILTER (WHERE e.id IS NOT NULL) as exam_ids
                FROM faculty f
                LEFT JOIN invigilator_assignments ia ON f.id = ia.faculty_id
                LEFT JOIN exams e ON ia.exam_id = e.id
                WHERE f.user_id IN (SELECT id FROM users WHERE is_active = true)
                GROUP BY f.id
            """)
            return [dict(row) for row in rows]

    async def get_time_slots(self, start_date: str, end_date: str, slot_types: List[str]) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT generate_series($1::date, $2::date, '1 day')::date as date
            """, start_date, end_date)
            dates = [row['date'] for row in rows]
            
            slots = []
            for date in dates:
                for slot_type in slot_types:
                    if slot_type == 'MORNING':
                        slots.append({'date': date, 'type': 'MORNING', 'start': '09:00', 'end': '12:00'})
                    elif slot_type == 'AFTERNOON':
                        slots.append({'date': date, 'type': 'AFTERNOON', 'start': '13:00', 'end': '16:00'})
                    elif slot_type == 'EVENING':
                        slots.append({'date': date, 'type': 'EVENING', 'start': '17:00', 'end': '20:00'})
            return slots

    async def save_timetable_entries(self, timetable_id: str, entries: List[Dict[str, Any]]) -> None:
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("DELETE FROM timetable_entries WHERE timetable_id = $1", timetable_id)
                for entry in entries:
                    await conn.execute("""
                        INSERT INTO timetable_entries (timetable_id, exam_id, room_id, date, start_time, end_time, session_type)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """, timetable_id, entry['exam_id'], entry['room_id'], entry['date'], 
                         entry['start_time'], entry['end_time'], entry.get('session_type', 'MORNING'))

    async def save_conflicts(self, timetable_id: str, conflicts: List[Dict[str, Any]]) -> None:
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("DELETE FROM conflicts WHERE timetable_id = $1", timetable_id)
                for conflict in conflicts:
                    await conn.execute("""
                        INSERT INTO conflicts (timetable_id, type, severity, description, entity_type, entity_id, 
                                             related_entity_type, related_entity_id, metadata)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """, timetable_id, conflict['type'], conflict['severity'], conflict['description'],
                         conflict['entity_type'], conflict['entity_id'],
                         conflict.get('related_entity_type'), conflict.get('related_entity_id'),
                         conflict.get('metadata'))

    async def save_seat_allocations(self, timetable_id: str, allocations: List[Dict[str, Any]]) -> None:
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("DELETE FROM seat_allocations WHERE timetable_id = $1", timetable_id)
                for alloc in allocations:
                    await conn.execute("""
                        INSERT INTO seat_allocations (timetable_id, student_id, exam_id, room_id, seat_row, seat_column, seat_number)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """, timetable_id, alloc['student_id'], alloc['exam_id'], alloc['room_id'],
                         alloc['seat_row'], alloc['seat_column'], alloc['seat_number'])

    async def save_invigilator_assignments(self, assignments: List[Dict[str, Any]]) -> None:
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                for assignment in assignments:
                    await conn.execute("""
                        INSERT INTO invigilator_assignments (exam_id, faculty_id, room_id, date, start_time, end_time, role)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT DO NOTHING
                    """, assignment['exam_id'], assignment['faculty_id'], assignment.get('room_id'),
                         assignment['date'], assignment['start_time'], assignment['end_time'], assignment['role'])


repository = DatabaseRepository()