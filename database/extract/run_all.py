"""Run the whole one-time seed extraction.

    python run_all.py --src "D:\\Workstation\\evalice\\docs" --out "..\\seed"

Order: endorsement -> pm_status -> contact_chip -> minor_tabs -> meancheck_grid -> master,
then writes seed/unmapped.json and seed/README.md and prints a summary.
The source workbooks are only ever opened read-only.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Context, ENDORSEMENT_XLSX, MEANCHECK_XLSX, add_common_args, write_json  # noqa: E402
import extract_contact_chip  # noqa: E402
import extract_endorsement  # noqa: E402
import extract_master  # noqa: E402
import extract_meancheck_grid  # noqa: E402
import extract_minor_tabs  # noqa: E402
import extract_pm_status  # noqa: E402

STEPS = [
    ("endorsement", extract_endorsement),
    ("pm_status", extract_pm_status),
    ("contact_chip", extract_contact_chip),
    ("minor_tabs", extract_minor_tabs),
    ("meancheck_grid", extract_meancheck_grid),
    ("master", extract_master),
]

FILE_NOTES = {
    "users.json": "master user list (idNo, name, role, aliases) - hand-written in common.USERS",
    "regions.json": "canonical regions with sortOrder",
    "categories.json": "endorsement categories with board section key and sortOrder",
    "models.csv": "HGA models with pitch/roll targets, tolerance and meancheck limits",
    "tools.csv": "union of tool codes from Contact Chip, Rev2.1, PM STATUS, Endorsement and minor tabs; region precedence Contact Chip > latest PM STATUS > Rev2.1",
    "tools_region_conflicts.json": "tools whose region differs between sources (chosen value included)",
    "tool_aliases.json": "raw tool spellings (upper, whitespace removed) that the SAA regex alone does not resolve -> code",
    "endorsements.csv": "'Endorsement ' sheet rows (skips rows with neither Tool nor Issue); endorse_by/endorse_to are |-joined user idNo",
    "pm_status.csv": "one row per (PM STATUS sheet, tool); H1/Delta formula columns dropped; unknown columns in `extra`",
    "contact_chip.csv": "'Contact Chip' cells per (tool, date); L/R/LR/PM/REPAIR, other text kept in `note`",
    "low_cpk.csv": "'Low Cpk' rows that have a Tool or Lot",
    "circuit_burn.csv": "'Circuit Burn' rows that have a Tool or Lot",
    "fit_ocap.csv": "hidden 'FIT OCAP' rows with any data; undocumented columns in `extra`",
    "weekly_ooc.csv": "hidden 'Weekly OOC' rows with any data besides the running number",
    "meancheck_daily.csv": "Rev2.1 grid: one row per (tool, date) with at least one of the 8 cells filled",
    "meancheck_daily_excel_overall.csv": "Rev2.1 rows 81-128: Excel's computed Overall per (tool, date) for verification",
    "unmapped.json": "raw values that could not be normalised + all warnings",
}


def write_readme(out_dir: Path, ctx: Context, src_dir: Path, elapsed: float) -> None:
    lines = [
        "# Seed data",
        "",
        f"Generated {dt.datetime.now().isoformat(timespec='seconds')} by `database/extract/run_all.py` "
        f"in {elapsed:.1f}s from (read-only):",
        f"- `{src_dir / ENDORSEMENT_XLSX}`",
        f"- `{src_dir / MEANCHECK_XLSX}`",
        "",
        "CSV files are UTF-8, comma separated, `csv.QUOTE_MINIMAL`, header row. JSON files are pretty-printed.",
        "Dates are ISO `YYYY-MM-DD`. Booleans are `true` / `false` / blank.",
        "",
        "## Files",
        "",
    ]
    for name, note in FILE_NOTES.items():
        cnt = ctx.counts.get(name)
        cnt_s = f"{cnt} rows" if name.endswith(".csv") else f"{cnt} entries" if cnt is not None else ""
        lines.append(f"- `{name}` — {cnt_s}{' — ' if cnt_s else ''}{note}")
    extra_counts = {k: v for k, v in ctx.counts.items() if k not in FILE_NOTES}
    if extra_counts:
        lines += ["", "Other counts:", ""]
        lines += [f"- {k}: {v}" for k, v in extra_counts.items()]
    lines += ["", "## Unmapped values", ""]
    for k, c in ctx.unmapped.items():
        lines.append(f"- {k}: {dict(c) if c else 'none'}")
    lines += ["", "## Decisions", ""]
    lines += [f"- {d}" for d in ctx.decisions] or ["- none"]
    lines += ["", f"## Warnings ({len(ctx.warnings)})", ""]
    lines += [f"- {w}" for w in ctx.warnings] or ["- none"]
    lines.append("")
    (out_dir / "README.md").write_text("\n".join(lines), encoding="utf-8")


def main(argv=None):
    ap = add_common_args(argparse.ArgumentParser(description=__doc__))
    a = ap.parse_args(argv)
    src_dir, out_dir = Path(a.src), Path(a.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    ctx = Context()
    t0 = time.time()
    for name, mod in STEPS:
        print(f"== {name}")
        t1 = time.time()
        mod.run(src_dir, out_dir, ctx)
        ctx.save(name)
        print(f"   ({time.time() - t1:.1f}s)")
    elapsed = time.time() - t0
    unmapped = {k: dict(v.most_common()) for k, v in ctx.unmapped.items()}
    unmapped["warnings"] = list(ctx.warnings)
    write_json(out_dir / "unmapped.json", unmapped)
    write_readme(out_dir, ctx, src_dir, elapsed)
    print("== summary")
    for k, v in ctx.counts.items():
        print(f"  {k}: {v}")
    print(f"  unmapped: { {k: len(v) for k, v in ctx.unmapped.items()} }")
    print(f"  warnings: {len(ctx.warnings)}")
    print(f"  done in {elapsed:.1f}s -> {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
