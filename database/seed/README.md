# Seed data

Generated 2026-09-25T22:30:10 by `database/extract/run_all.py` in 4.4s from (read-only):
- `D:\Workstation\evalice\docs\Endorsement nmin n nkaexcel\SAA Process Endorsement_2026_NEW.xlsx`
- `D:\Workstation\evalice\docs\all\all about\1st Meancheck excel template\First Mean Check Monitoring Rev2.1_NEW.xlsx`

CSV files are UTF-8, comma separated, `csv.QUOTE_MINIMAL`, header row. JSON files are pretty-printed.
Dates are ISO `YYYY-MM-DD`. Booleans are `true` / `false` / blank.

## Files

- `users.json` — 24 entries — master user list (idNo, name, role, aliases) - hand-written in common.USERS
- `regions.json` — 6 entries — canonical regions with sortOrder
- `categories.json` — 10 entries — endorsement categories with board section key and sortOrder
- `models.csv` — 15 rows — HGA models with pitch/roll targets, tolerance and meancheck limits
- `tools.csv` — 65 rows — union of tool codes from Contact Chip, Rev2.1, PM STATUS, Endorsement and minor tabs; region precedence Contact Chip > latest PM STATUS > Rev2.1
- `tools_region_conflicts.json` — 6 entries — tools whose region differs between sources (chosen value included)
- `tool_aliases.json` — 14 entries — raw tool spellings (upper, whitespace removed) that the SAA regex alone does not resolve -> code
- `endorsements.csv` — 3976 rows — 'Endorsement ' sheet rows (skips rows with neither Tool nor Issue); endorse_by/endorse_to are |-joined user idNo
- `pm_status.csv` — 667 rows — one row per (PM STATUS sheet, tool); H1/Delta formula columns dropped; unknown columns in `extra`
- `contact_chip.csv` — 112 rows — 'Contact Chip' cells per (tool, date); L/R/LR/PM/REPAIR, other text kept in `note`
- `low_cpk.csv` — 0 rows — 'Low Cpk' rows that have a Tool or Lot
- `circuit_burn.csv` — 0 rows — 'Circuit Burn' rows that have a Tool or Lot
- `fit_ocap.csv` — 68 rows — hidden 'FIT OCAP' rows with any data; undocumented columns in `extra`
- `weekly_ooc.csv` — 694 rows — hidden 'Weekly OOC' rows with any data besides the running number
- `meancheck_daily.csv` — 10148 rows — Rev2.1 grid: one row per (tool, date) with at least one of the 8 cells filled
- `meancheck_daily_excel_overall.csv` — 12288 rows — Rev2.1 rows 81-128: Excel's computed Overall per (tool, date) for verification
- `unmapped.json` — raw values that could not be normalised + all warnings

Other counts:

- endorsements.csv rows with tool_code: 3975
- pm_status.csv sheets: 16

## Unmapped values

- tools: none
- people: {'p': 1}
- categories: none
- contact_chip_values: none
- daily_cells: {'hello po': 1}

## Decisions

- Endorsement: rows with neither Tool nor Issue are skipped; a row with an Issue but no Tool is kept with blank tool_code; Remarks DONE/Done -> done, Ongoing -> ongoing, blank -> open
- PM STATUS: sheet 'APRIL 2025' skipped (not a 'PM STATUS <MONTH> <YEAR>' tab; it is empty)
- FIT OCAP: columns ['F'] are not in the documented header -> `extra` JSON
- FIT OCAP: rows that only carry the running number (template filler) are not emitted
- Weekly OOC: rows that only carry the running number (template filler) are not emitted
- Rev2.1: row-12 date cells are trusted as-is (the sequence jumps twice); a (tool, date) that occurs in two blocks keeps the block with more filled cells; combined tool cells like 'SAA78H/SAA68H' are skipped
- tools.csv: union of codes from Contact Chip, Rev2.1, PM STATUS, Endorsement and the minor tabs; region and tool type precedence Contact Chip > latest PM STATUS > Rev2.1; ee_name from the latest PM STATUS month with an EE

## Warnings (39)

- Endorsement!row 268: missing date
- Endorsement!row 268: missing shift
- Endorsement!row 419: missing date
- Endorsement!row 419: missing shift
- Endorsement!row 1689: row has an issue but no tool -> tool_code blank
- PM STATUS MARCH 2026: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (new: 34 vs 19)
- PM STATUS MAY 2026: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 23 vs 23)
- typo date '5/212026' at PM STATUS MAY 2026!row 35 -> repaired to 2026-05-21
- PM STATUS MAY 2026: tool SAA48H appears twice (raw 'SAA48H' / 'SAA48H'); kept the row with more filled cells (first: 34 vs 20)
- PM STATUS APRIL 2026: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 34 vs 23)
- PM STATUS JULY 2026: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 19 vs 19)
- PM STATUS AUGUST 2026: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 19 vs 19)
- PM STATUS SEPTEMBER 2026: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 19 vs 19)
- PM STATUS MAY 2025: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 19 vs 19)
- typo date '4/14//2025' at PM STATUS APRIL 2025!row 22 -> repaired to 2025-04-14
- PM STATUS APRIL 2025: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 19 vs 19)
- PM STATUS OCTOBER 2025: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (new: 34 vs 19)
- PM STATUS NOVEMBER 2025: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (new: 34 vs 19)
- PM STATUS DECEMBER 2025: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 19 vs 19)
- PM STATUS JANUARY 2026: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 34 vs 19)
- PM STATUS FEBRUARY 2026: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 34 vs 19)
- PM STATUS SEPTEMBER 2025: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 32 vs 19)
- PM STATUS AUGUST 2025: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 19 vs 19)
- PM STATUS JULY 2025: tool SAA71H appears twice (raw 'SAA71H' / 'SAA71H'); kept the row with more filled cells (first: 19 vs 19)
- Contact Chip!row 62: tool SAA78H already listed at row 61 (this row: region 'CB Line', type 'SAAT03'); region/type taken from the first row, cells merged
- Contact Chip!row 63: tool SAA78H already listed at row 61 (this row: region 'CB Line', type 'SAAT03'); region/type taken from the first row, cells merged
- typo date '11/122025' at FIT OCAP!row 63 -> repaired to 2025-11-12
- typo date '12/012025' at FIT OCAP!row 64 -> repaired to 2025-12-01
- unparseable date '05/09/20256' at FIT OCAP!row 69 -> blank
- Rev2.1!AGK12: date out of sequence: 2024-08-16 (col AGC) -> 2026-01-01; trusting the cell value
- Rev2.1!FZA12: date out of sequence: 2027-04-28 (col FYS) -> 2025-12-13; trusting the cell value
- Rev2.1!C36: combined tool cell 'SAA78H/SAA68H' -> row skipped
- unknown area/region 'CLASS 101' at Rev2.1!B37 -> Class 100
- Rev2.1!C38: combined tool cell 'SAA34H/SAA71H' -> row skipped
- Rev2.1!C63: tool SAA52H also at row 28; on duplicate (tool, date) the block with more filled cells wins
- Rev2.1!row 70: no tool code in column C but 66 data cells -> row skipped
- Rev2.1!C71: tool SAA70H also at row 37; on duplicate (tool, date) the block with more filled cells wins
- Rev2.1: SAA52H listed at rows 28 and 63: 122 duplicate (tool, date) blocks - kept the block with more filled cells (row 28 won 120x, row 63 won 2x)
- Rev2.1: SAA70H listed at rows 37 and 71: 63 duplicate (tool, date) blocks - kept the block with more filled cells (row 37 won 47x, row 71 won 16x)
