from typing import List, Dict, Any
from collections import defaultdict

from models.request import InvigilatorAllocationRequest, ExamSessionInput, FacultyInfo
from models.response import InvigilatorAllocationResponse, InvigilatorAssignmentOutput, InvigilatorStatistics


class InvigilatorAllocator:
    def allocate(self, request: InvigilatorAllocationRequest) -> InvigilatorAllocationResponse:
        exam_sessions = request.exam_sessions
        faculty_list = {f.id: f for f in request.faculty}
        ratio = request.invigilator_ratio
        
        session_requirements = self._calculate_requirements(exam_sessions, ratio)
        assignments = self._assign_invigilators(
            session_requirements, 
            faculty_list, 
            request.include_relievers, 
            request.reliever_percentage
        )
        
        stats = self._calculate_statistics(assignments, faculty_list)
        
        return InvigilatorAllocationResponse(assignments=assignments, statistics=stats)

    def _calculate_requirements(
        self, 
        exam_sessions: List[ExamSessionInput], 
        ratio: int
    ) -> List[Dict[str, Any]]:
        requirements = []
        for session in exam_sessions:
            num_invigilators = max(1, (session.student_count + ratio - 1) // ratio)
            requirements.append({
                'exam_id': session.exam_id,
                'room_id': session.room_id,
                'date': session.date,
                'start_time': session.start_time,
                'end_time': session.end_time,
                'student_count': session.student_count,
                'required_count': num_invigilators,
                'assigned': [],
            })
        return requirements

    def _assign_invigilators(
        self,
        requirements: List[Dict[str, Any]],
        faculty: Dict[str, FacultyInfo],
        include_relievers: bool,
        reliever_percentage: int,
    ) -> List[InvigilatorAssignmentOutput]:
        faculty_workload = {fid: 0 for fid in faculty}
        faculty_max = {fid: f.max_workload for fid, f in faculty.items()}
        
        requirements.sort(key=lambda r: (-r['student_count'], r['date'], r['start_time']))
        
        assignments = []
        
        for req in requirements:
            needed = req['required_count']
            assigned = []
            
            available_faculty = self._get_available_faculty(
                req['date'], req['start_time'], req['end_time'],
                faculty, faculty_workload, faculty_max, assigned
            )
            
            available_faculty.sort(key=lambda f: faculty_workload[f])
            
            for fac_id in available_faculty:
                if len(assigned) >= needed:
                    break
                assigned.append(fac_id)
                faculty_workload[fac_id] += 1
                
                role = 'CHIEF' if len(assigned) == 1 else 'INVIGILATOR'
                assignments.append(InvigilatorAssignmentOutput(
                    exam_id=req['exam_id'],
                    faculty_id=fac_id,
                    room_id=req['room_id'],
                    date=req['date'],
                    start_time=req['start_time'],
                    end_time=req['end_time'],
                    role=role,
                ))
            
            if include_relievers and assigned:
                reliever_count = max(1, (needed * reliever_percentage) // 100)
                reliever_candidates = [
                    f for f in available_faculty 
                    if f not in assigned and faculty_workload[f] < faculty_max[f]
                ]
                reliever_candidates.sort(key=lambda f: faculty_workload[f])
                
                for fac_id in reliever_candidates[:reliever_count]:
                    faculty_workload[fac_id] += 1
                    assignments.append(InvigilatorAssignmentOutput(
                        exam_id=req['exam_id'],
                        faculty_id=fac_id,
                        room_id=req['room_id'],
                        date=req['date'],
                        start_time=req['start_time'],
                        end_time=req['end_time'],
                        role='RELIEVER',
                    ))
        
        return assignments

    def _get_available_faculty(
        self,
        date: str,
        start_time: str,
        end_time: str,
        faculty: Dict[str, FacultyInfo],
        faculty_workload: Dict[str, int],
        faculty_max: Dict[str, int],
        already_assigned: List[str],
    ) -> List[str]:
        available = []
        for fac_id, fac in faculty.items():
            if fac_id in already_assigned:
                continue
            if faculty_workload[fac_id] >= faculty_max[fac_id]:
                continue
            available.append(fac_id)
        return available

    def _calculate_statistics(
        self,
        assignments: List[InvigilatorAssignmentOutput],
        faculty: Dict[str, FacultyInfo],
    ) -> InvigilatorStatistics:
        total_assigned = len(assignments)
        faculty_utilized = len(set(a.faculty_id for a in assignments))
        
        workload = defaultdict(int)
        for a in assignments:
            workload[a.faculty_id] += 1
        
        avg_workload = sum(workload.values()) / faculty_utilized if faculty_utilized > 0 else 0
        
        return InvigilatorStatistics(
            total_assigned=total_assigned,
            faculty_utilized=faculty_utilized,
            average_workload=round(avg_workload, 1),
        )