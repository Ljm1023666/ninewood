#!/usr/bin/env python3
"""TASK-11 路径检索修复验收脚本（B + D 类）"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://localhost:3001/api/path-search"


def get(path: str) -> dict:
    url = f"{BASE}{path}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def ok(cond: bool, msg: str) -> tuple[bool, str]:
    return cond, msg


def main() -> int:
    results: list[tuple[str, bool, str]] = []

    # B1
    try:
        d = get("/resolve?" + urllib.parse.urlencode({"q": "预算500"}))
        facets = d.get("data", {}).get("facets", [])
        passed, detail = ok("bkt:price=100_500" in facets, f"facets={facets}")
        results.append(("B1 resolve 预算500", passed, detail))
    except Exception as e:
        results.append(("B1 resolve 预算500", False, str(e)))

    # B2
    try:
        d = get("/resolve?" + urllib.parse.urlencode({"q": "北京 家政"}))
        data = d.get("data", {})
        facets = data.get("facets", [])
        paths = data.get("paths", [])
        passed = "rgn:110000" in facets and any("家政" in p for p in paths)
        results.append(("B2 resolve 北京 家政", passed, f"facets={facets}, paths={paths}"))
    except Exception as e:
        results.append(("B2 resolve 北京 家政", False, str(e)))

    # B3 baseline + filtered
    try:
        base = get("/?" + urllib.parse.urlencode({"paths": "cat:家政服务", "limit": "1"}))
        base_total = base.get("data", {}).get("total", 0)
        filt = get(
            "/?"
            + urllib.parse.urlencode(
                {"paths": "cat:家政服务", "facets": "rgn:110000", "limit": "1"}
            )
        )
        filt_total = filt.get("data", {}).get("total", 0)
        passed = filt_total > 0 and filt_total < base_total
        results.append(
            (
                "B3 search 家政+rgn",
                passed,
                f"base={base_total}, filtered={filt_total}",
            )
        )
    except Exception as e:
        results.append(("B3 search 家政+rgn", False, str(e)))

    # B4
    try:
        d = get(
            "/?"
            + urllib.parse.urlencode(
                {"paths": "cat:家政服务", "facets": "bkt:price=100_500", "limit": "1"}
            )
        )
        total = d.get("data", {}).get("total", 0)
        results.append(("B4 search 家政+bkt", total > 0, f"total={total}"))
    except Exception as e:
        results.append(("B4 search 家政+bkt", False, str(e)))

    # B5
    try:
        d = get("/coverage?" + urllib.parse.urlencode({"paths": "rgn:110000"}))
        cov = d.get("data", {}).get("coverage", {})
        n = cov.get("rgn:110000", 0)
        results.append(("B5 coverage rgn", n > 0, f"rgn:110000={n}, coverage={cov}"))
    except Exception as e:
        results.append(("B5 coverage rgn", False, str(e)))

    # B6
    try:
        d = get("/coverage?" + urllib.parse.urlencode({"paths": "bkt:price=100_500"}))
        cov = d.get("data", {}).get("coverage", {})
        n = cov.get("bkt:price=100_500", 0)
        results.append(("B6 coverage bkt", n > 0, f"bkt:price=100_500={n}, coverage={cov}"))
    except Exception as e:
        results.append(("B6 coverage bkt", False, str(e)))

    # B7
    try:
        d = get(
            "/coverage?"
            + urllib.parse.urlencode({"paths": "cat:家政服务,rgn:110000"})
        )
        cov = d.get("data", {}).get("coverage", {})
        has_cat = "cat:家政服务" in cov
        has_rgn = "rgn:110000" in cov
        passed = has_cat and has_rgn
        results.append(("B7 coverage cat+rgn", passed, f"coverage keys={list(cov.keys())}"))
    except Exception as e:
        results.append(("B7 coverage cat+rgn", False, str(e)))

    # D1
    try:
        d = get("/resolve?" + urllib.parse.urlencode({"q": "打车"}))
        data = d.get("data", {})
        exclude = data.get("excludePaths", [])
        passed = len(exclude) > 0
        results.append(("D1 resolve 打车 expansion", passed, f"excludePaths={exclude}"))
    except Exception as e:
        results.append(("D1 resolve 打车 expansion", False, str(e)))

    print("=" * 60)
    print("TASK-11 Path Search Fix Acceptance (B + D)")
    print("=" * 60)
    all_pass = True
    for name, passed, detail in results:
        mark = "PASS" if passed else "FAIL"
        if not passed:
            all_pass = False
        print(f"[{mark}] {name}")
        print(f"       {detail}")
    print("=" * 60)
    print("OVERALL:", "PASS" if all_pass else "FAIL")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
