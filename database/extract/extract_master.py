"""Write the master seed files: users.json, regions.json, categories.json, models.csv,
tools.csv, tools_region_conflicts.json, tool_aliases.json.

tools.csv is the union of every tool code seen by the other extractors, so run it
last (run_all.py does this in-process; standalone it reads the intermediate JSON
files the other scripts drop in extract/.intermediate/).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    CATEGORIES, MODEL_LIMITS, MODELS, REGIONS, TOOL_ALIASES, USERS, Context, add_common_args, fmt_cell,
    tool_sort_order, user_name, write_csv, write_json,
)

TOOLS_HEADER = ["code", "region", "tool_type", "ee_name", "sort_order", "sources"]
# region / tool-type precedence
PRECEDENCE = ["contact_chip", "pm_status", "rev21"]
# every source that contributes codes to the union (order = display order in `sources`)
SOURCES = ["contact_chip", "rev21", "pm_status", "endorsement", "fit_ocap", "weekly_ooc", "low_cpk", "circuit_burn"]


def latest_pm(info: dict, key: str):
    """Value of `key` from the latest PM STATUS period that has a non-empty one."""
    for period in sorted(info.get("by_period", {}), reverse=True):
        v = info["by_period"][period].get(key)
        if v:
            return v, period
    return None, None


def build_tools(ctx: Context):
    codes = set()
    for src in SOURCES:
        codes.update(ctx.tools.get(src, {}))
    for src in ctx.tools:
        if src not in SOURCES:
            ctx.warn(f"tools: unexpected tool source {src!r} ignored for the union")
    rows = []
    conflicts = []
    for code in sorted(codes, key=lambda c: (tool_sort_order(c), c)):
        per_src_region = {}
        per_src_type = {}
        for src in PRECEDENCE:
            info = ctx.tools.get(src, {}).get(code)
            if not info:
                continue
            if src == "pm_status":
                region, _p = latest_pm(info, "region")
                ttype, _p = latest_pm(info, "tool_type")
            else:
                region, ttype = info.get("region"), info.get("tool_type")
            if region:
                per_src_region[src] = region
            if ttype:
                per_src_type[src] = ttype
        region = next((per_src_region[s] for s in PRECEDENCE if s in per_src_region), "")
        ttype = next((per_src_type[s] for s in PRECEDENCE if s in per_src_type), "")
        if len(set(per_src_region.values())) > 1:
            conflicts.append({"code": code, "chosen": region, "regions": per_src_region})
        ee_name = ""
        pm = ctx.tools.get("pm_status", {}).get(code)
        if pm:
            ids, period = latest_pm(pm, "ee_ids")
            if ids:
                ee_name = " / ".join(user_name(i) for i in ids)
            else:
                raw, period = latest_pm(pm, "ee")
                if raw:
                    ctx.warn(f"tools: {code} EE {raw!r} ({period}) did not resolve to a user -> ee_name blank")
        srcs = [s for s in SOURCES if code in ctx.tools.get(s, {})]
        if not region:
            ctx.warn(f"tools: {code} has no region in any source (sources: {srcs})")
        rows.append([code, region, ttype, ee_name, tool_sort_order(code), "|".join(srcs)])
    return rows, conflicts


def run(src_dir, out_dir, ctx: Context) -> int:
    out = Path(out_dir)
    write_json(out / "users.json", USERS)
    ctx.count("users.json", len(USERS))
    write_json(out / "regions.json", [{"name": r, "sortOrder": i + 1} for i, r in enumerate(REGIONS)])
    ctx.count("regions.json", len(REGIONS))
    write_json(out / "categories.json", [{"name": n, "sectionKey": k, "sortOrder": i + 1} for i, (n, k) in enumerate(CATEGORIES)])
    ctx.count("categories.json", len(CATEGORIES))
    n = write_csv(out / "models.csv",
                  ["code", "pitch_target", "roll_target", "tolerance", "delta_sat_limit", "delta_target_limit", "sigma_limit", "cpk_min"],
                  [[c, fmt_cell(float(p)), fmt_cell(float(r)), fmt_cell(float(t))] + [fmt_cell(MODEL_LIMITS[k]) for k in
                    ("delta_sat_limit", "delta_target_limit", "sigma_limit", "cpk_min")] for c, p, r, t in MODELS])
    ctx.count("models.csv", n)

    ctx.decide("tools.csv: union of codes from Contact Chip, Rev2.1, PM STATUS, Endorsement and the minor tabs; region and tool type "
               "precedence Contact Chip > latest PM STATUS > Rev2.1; ee_name from the latest PM STATUS month with an EE")
    rows, conflicts = build_tools(ctx)
    n = write_csv(out / "tools.csv", TOOLS_HEADER, rows)
    ctx.count("tools.csv", n)
    write_json(out / "tools_region_conflicts.json", conflicts)
    ctx.count("tools_region_conflicts.json", len(conflicts))
    aliases = dict(TOOL_ALIASES)
    aliases.update(ctx.tool_alias_hits)
    aliases = dict(sorted(aliases.items()))
    write_json(out / "tool_aliases.json", aliases)
    ctx.count("tool_aliases.json", len(aliases))
    print(f"  users.json {len(USERS)}, regions.json {len(REGIONS)}, categories.json {len(CATEGORIES)}, models.csv {len(MODELS)}")
    print(f"  tools.csv: {len(rows)} tools; region conflicts: {len(conflicts)}; tool_aliases.json: {len(aliases)}")
    return len(rows)


def main(argv=None):
    ap = add_common_args(argparse.ArgumentParser(description=__doc__))
    a = ap.parse_args(argv)
    ctx = Context.load_all(["endorsement", "pm_status", "contact_chip", "minor_tabs", "meancheck_grid"])
    run(a.src, a.out, ctx)
    ctx.save("master")


if __name__ == "__main__":
    main()
