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
