#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""路径检索检索能力测试脚本（自包含，仅用标准库 urllib）。"""
import json
import urllib.parse
import urllib.request

BASE = "http://localhost:3001/api/path-search"

def call(path, params=None, timeout=15):
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params, safe=":")
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = {"raw": e.read().decode("utf-8", "replace")}
        return e.code, body
    except Exception as e:
        return -1, {"error": str(e)}

def line():
    print("-" * 78)

print("#" * 78)
print("#  路径检索 · 检索能力测试")
print("#" * 78)

# ============================================================
# 1. RESOLVE 测试：把用户查询解析成池内真实路径
# ============================================================
print("\n=== A. 解析能力 (resolve) ===\n")

resolve_cases = [
    ("家政", "基础中文词"),
    ("技术开发", "基础中文词"),
    ("王者荣耀代练", "游戏类长词"),
    ("我想找个设计师帮我做logo", "自然语言长句"),
    ("线上 翻译", "自然词 + 服务方式(facet)"),
    ("cat:设计", "显式分类前缀"),
    ("tag:react", "显式标签前缀"),
    ("React Vue 前端", "英文技术词组合"),
    ("帮我找个人陪玩星穹铁道", "自然句 + 游戏"),
    ("xyzqwerty随机词不存在", "无意义词(应空)"),
    ("", "空查询(应报错)"),
]

resolve_report = []
for q, desc in resolve_cases:
    status, body = call("/resolve", {"q": q} if q else {})
    if status == 200 and body.get("code") == 200:
        d = body["data"]
        paths = d.get("paths", [])
        intent = d.get("intentPaths", [])
        facets = d.get("facets", [])
        seg = d.get("segments", [])
        print(f"[OK] {desc}\n  q={q!r}")
        print(f"      paths({len(paths)}): {paths}")
        print(f"      intent({len(intent)}): {intent}")
        if facets:
            print(f"      facets({len(facets)}): {facets}")
        print(f"      segments: {seg}")
        resolve_report.append((q, desc, "OK", len(paths), len(intent), paths, intent, facets))
    else:
        msg = body.get("message") or body.get("error") or body
        print(f"[FAIL/{status}] {desc}\n  q={q!r}\n  -> {msg}")
        resolve_report.append((q, desc, f"FAIL/{status}", 0, 0, [], [], []))
    line()

# ============================================================
# 2. SEARCH 测试：用解析出的路径做交叉命中检索
# ============================================================
print("\n=== B. 检索能力 (search) ===\n")

def do_search(paths, extra=None):
    p = {"paths": ",".join(paths)}
    if extra:
        p.update(extra)
    return call("/", p)

# 用上面成功 resolve 的第一个有结果的词来跑检索矩阵
search_probe = None
for q, desc, st, np_, ni, paths, intent, facets in resolve_report:
    if st == "OK" and paths:
        search_probe = (q, paths, intent, facets)
        break

if not search_probe:
    print("没有可用的解析结果，跳过检索测试")
else:
    q, paths, intent, facets = search_probe
    print(f"使用探针查询 q={q!r}，解析路径={paths}\n")

    # 2.1 默认检索
    status, body = do_search(paths)
    if status == 200 and body.get("code") == 200:
        d = body["data"]
        print(f"[默认] total={d['total']} page={d['page']}/{d['totalPages']} items={len(d['items'])}")
        print(f"      meta.minHitRequired={d['meta']['minHitRequired']} match={d['meta']['match']} sort={d['meta']['sort']}")
        print(f"      coverage={d['coverage']}")
        if d["items"]:
            top = d["items"][0]
            print(f"      首条: {top['title']} | 命中{top['hitCount']}/{len(paths)} | matched={top['matchedPaths']}")
    else:
        print(f"[默认] FAIL/{status}: {body}")
    line()

    # 2.2 匹配模式矩阵
    print("匹配模式矩阵:")
    for match in ["any", "all", "custom"]:
        extra = {"match": match}
        if match == "custom":
            extra["minHit"] = max(1, len(paths) // 2)
        status, body = do_search(paths, extra)
        if status == 200 and body.get("code") == 200:
            d = body["data"]
            print(f"  match={match:7s} minHit={d['meta']['minHitRequired']:<3} -> total={d['total']}")
        else:
            print(f"  match={match:7s} FAIL/{status}: {body}")
    line()

    # 2.3 意图匹配
    if intent:
        print("意图匹配 (intentMatch):")
        for im in ["off", "any", "all"]:
            status, body = do_search(paths, {"intentMatch": im})
            if status == 200 and body.get("code") == 200:
                d = body["data"]
                print(f"  intentMatch={im:4s} -> total={d['total']} intentPaths={d['meta']['intentPathCount']}")
            else:
                print(f"  intentMatch={im:4s} FAIL/{status}: {body}")
        line()

    # 2.4 排序模式
    print("排序模式 (sort):")
    for sort in ["cross_hit", "intent_first", "hit_rate", "credit", "newest", "price_asc", "price_desc"]:
        status, body = do_search(paths, {"sort": sort})
        if status == 200 and body.get("code") == 200:
            d = body["data"]
            label = ""
            if d["items"]:
                it = d["items"][0]
                label = f"首条命中={it['hitCount']} 价格={it['minPrice']} 信用={it['user']['creditScore']}"
            print(f"  sort={sort:11s} -> total={d['total']} {label}")
        else:
            print(f"  sort={sort:11s} FAIL/{status}: {body}")
    line()

    # 2.5 硬筛选 facet
    if facets:
        print(f"硬筛选 facet={facets}:")
        status, body = do_search(paths, {"facets": ",".join(facets)})
        if status == 200 and body.get("code") == 200:
            d = body["data"]
            print(f"  -> total={d['total']} (无 facet 时 total 见上)")
        else:
            print(f"  FAIL/{status}: {body}")
        line()

    # 2.6 coverage 接口
    status, body = call("/coverage", {"paths": ",".join(paths)})
    if status == 200 and body.get("code") == 200:
        print(f"coverage 接口: {body['data']['coverage']}")
    else:
        print(f"coverage FAIL/{status}: {body}")
    line()

    # 2.7 分页
    status, body = do_search(paths, {"page": 1, "limit": 5})
    if status == 200 and body.get("code") == 200:
        d = body["data"]
        print(f"分页 limit=5 -> 返回{len(d['items'])}条 totalPages={d['totalPages']}")
    else:
        print(f"分页 FAIL/{status}: {body}")
    line()

# ============================================================
# 3. 异常/边界
# ============================================================
print("\n=== C. 边界 & 异常 ===\n")
# 空 paths
status, body = call("/", {"paths": ""})
print(f"空 paths 检索: {status} -> {body.get('message','')[:60]}")
# 非法路径
status, body = call("/", {"paths": "garbage:xxx,notapath"})
print(f"非法路径检索: {status} -> {body.get('message','')[:80]}")
# resolve 空
status, body = call("/resolve", {})
print(f"resolve 空 q: {status} -> {body.get('message','')[:60]}")
line()

print("\n=== 测试结束 ===")
