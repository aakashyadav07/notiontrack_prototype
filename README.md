# ExamFlow — CSDS Only

This build uses **only the CSDS 2nd Year 2026-27 student workbook** as the student dataset.

Source:
`data/source/CSDS_2nd Year 2026-27(2).xlsx`

Imported students: **455**

The browser/local demo database is versioned as `csds-only-v2`, so an older cached database containing CSIT/ECE data or the previous 2-student demo is automatically discarded.

## Deploy
- Root: `examflow`
- Build: `npm install`
- Start: `npm start`

For a static `file://` demo, the same CSDS dataset is embedded in `index.html`.

Login:
`admin@college.edu`
`demo123456`

## Timetable generation controls

The timetable wizard now lets the administrator:
- select which departments participate in a generation run;
- assign a different exam date to each selected department;
- define any number of custom exam time slots;
- select exactly which rooms may be used and exclude rooms with maintenance/problems;
- generate room-by-room allocations without exceeding room capacity;
- see the resulting room utilization on the dashboard.

Generating a timetable replaces only the selected departments' timetable entries; other departments remain unchanged.
