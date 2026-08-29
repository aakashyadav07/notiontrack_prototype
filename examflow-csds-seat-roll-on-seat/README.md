# ExamFlow — CSDS Timetable + Automatic Room-wise Seat Allocation

This package uses the CSDS student dataset (455 students) and keeps the existing ExamFlow features.

## New behavior
- Generate the timetable using selected departments, dates, rooms, and custom time slots.
- Immediately after timetable generation, Seat Allocation is populated automatically from the generated timetable.
- Seat Allocation is selectable by generated exam/room.
- Each room/exam shows the actual CSDS university roll numbers assigned to every seat.
- The student-to-seat map uses the Excel roll numbers and student names.
- You can still refresh/regenerate a seat map and change the number of columns.

## Login
- Email: admin@college.edu
- Password: demo123456

## Run
```bash
npm install
npm start
```
