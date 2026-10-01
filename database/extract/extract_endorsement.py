"""Extract the 'Endorsement ' sheet -> seed/endorsements.csv"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    Context, add_common_args, blank, cell_text, iter_rows_until_gap, normalize_category,
    normalize_progress, normalize_shift, normalize_tool, sheet_by_name, split_people, to_iso_date, write_csv,
)

SHEET = "Endorsement "
HEADER = [
    "source_row", "seq_no", "date", "shift", "category", "tool_raw", "tool_code", "issue", "action_status",
    "progress", "endorse_by_raw", "endorse_to_raw", "endorse_by", "endorse_to",
]
# 0-based column indexes (D=3 ... M=12)
C_NO, C_DATE, C_SHIFT, C_SEL, C_TOOL, C_ISSUE, C_STATUS, C_BY, C_TO, C_REM = 3, 4, 5, 6, 7, 8, 9, 10, 11, 12


def run(src_dir, out_dir, ctx: Context) -> int:
    wb = ctx.endorsement_wb(src_dir)
    ws = sheet_by_name(wb, SHEET)
    rows = []
    ctx.decide("Endorsement: rows with neither Tool nor Issue are skipped; a row with an Issue but no Tool is kept with blank tool_code; "
               "Remarks DONE/Done -> done, Ongoing -> ongoing, blank -> open")
    months: Counter = Counter()
    cats: Counter = Counter()
    for n, r in iter_rows_until_gap(ws, min_len=13):
        if n == 1:
            hdr = [cell_text(x) for x in r[C_NO:C_REM + 1]]
            expected = ["No", "Date", "Shift", "Selection", "Tool", "Issue", "Status", "Endorse by", "Endorse to", "Remarks"]
            if hdr != expected:
                ctx.warn(f"Endorsement header differs from expected: {hdr}")
            continue
        tool_raw = r[C_TOOL]
        issue = r[C_ISSUE]
        if blank(tool_raw) and blank(issue):
            continue
        where = f"Endorsement!row {n}"
        tool_code = normalize_tool(tool_raw, ctx) if not blank(tool_raw) else None
        if blank(tool_raw):
            ctx.warn(f"{where}: row has an issue but no tool -> tool_code blank")
        elif tool_code is None:
            ctx.warn(f"{where}: unresolved tool {tool_raw!r}")
        else:
            ctx.see_tool("endorsement", tool_code, raw=cell_text(tool_raw))
        date = to_iso_date(r[C_DATE], ctx, where)
        if not date:
            ctx.warn(f"{where}: missing date")
        shift = normalize_shift(r[C_SHIFT], ctx, where)
        if not shift:
            ctx.warn(f"{where}: missing shift")
        category = normalize_category(r[C_SEL], ctx)
        if not category and not blank(r[C_SEL]):
            ctx.warn(f"{where}: unknown category {r[C_SEL]!r}")
        by_ids = split_people(r[C_BY], ctx)
        to_ids = split_people(r[C_TO], ctx)
        seq = r[C_NO]
        if isinstance(seq, float) and seq.is_integer():
            seq = int(seq)
        rows.append([
            n, cell_text(seq), date, shift, category, cell_text(tool_raw), tool_code or "",
            cell_text(issue), cell_text(r[C_STATUS]), normalize_progress(r[C_REM]),
            cell_text(r[C_BY]), cell_text(r[C_TO]), "|".join(by_ids), "|".join(to_ids),
        ])
        months[date[:7] if date else "(none)"] += 1
        cats[category or "(blank)"] += 1
    out = Path(out_dir) / "endorsements.csv"
    n = write_csv(out, HEADER, rows)
    ctx.count("endorsements.csv", n)
    ctx.count("endorsements.csv rows with tool_code", sum(1 for r in rows if r[6]))
    print(f"  endorsements.csv: {n} rows")
    print("  per month:", dict(sorted(months.items())))
    print("  per category:", dict(cats.most_common()))
    return n


def main(argv=None):
    ap = add_common_args(argparse.ArgumentParser(description=__doc__))
    a = ap.parse_args(argv)
    ctx = Context()
    run(a.src, a.out, ctx)
    ctx.save("endorsement")
    print("  unmapped:", {k: dict(v) for k, v in ctx.unmapped.items() if v})


if __name__ == "__main__":
    main()
