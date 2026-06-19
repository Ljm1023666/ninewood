"""
本地 GPU 语义分类服务
接收文本，返回匹配的分类节点 + 相似度
"""
import os
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'

import numpy as np
import faiss
import pickle
import sqlite3
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor

# ─── 路径 ────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / 'categories.db'
FAISS_PATH = BASE_DIR / 'category_index.faiss'
IDS_PATH = BASE_DIR / 'category_ids.pkl'

# ─── 模型 & 索引 ─────────────────────────────────
print('[Classifier] Loading model...')
_device = 'cuda' if os.environ.get('CUDA_VISIBLE_DEVICES') != '-1' else 'cpu'
try:
    import torch
    _device = 'cuda' if torch.cuda.is_available() else 'cpu'
except ImportError:
    _device = 'cpu'
print(f'[Classifier] Using device: {_device}')
_model = SentenceTransformer('BAAI/bge-small-zh-v1.5', device=_device)
print(f'[Classifier] Model loaded, dim={_model.get_sentence_embedding_dimension()}')

print('[Classifier] Loading FAISS index...')
_index = faiss.read_index(str(FAISS_PATH))
with open(IDS_PATH, 'rb') as f:
    _ids = pickle.load(f)
print(f'[Classifier] Index loaded: {len(_ids)} vectors')

_executor = ThreadPoolExecutor(max_workers=2)

# ─── FastAPI ──────────────────────────────────────
app = FastAPI(title='Local Classifier', version='1.0.0')

class ClassifyRequest(BaseModel):
    text: str
    top_k: int = 5
    threshold: float = 0.15

class CategoryMatch(BaseModel):
    category_id: str
    name: str
    path: str
    similarity: float
    depth: int

class ClassifyResponse(BaseModel):
    source: str
    results: list[CategoryMatch]

@lru_cache(maxsize=500)
def _classify_sync(text: str, top_k: int = 5, threshold: float = 0.15) -> list[tuple]:
    """同步分类逻辑"""
    vec = _model.encode([text], normalize_embeddings=True)
    scores, indices = _index.search(vec.astype(np.float32), top_k)
    
    results = []
    conn = sqlite3.connect(str(DB_PATH))
    for score, idx in zip(scores[0], indices[0]):
        if score < threshold:
            continue
        cat_id = _ids[idx]
        row = conn.execute(
            'SELECT name, path, depth FROM categories WHERE id = ?', (cat_id,)
        ).fetchone()
        if row:
            results.append((cat_id, row[0], row[1], float(score), row[2]))
    conn.close()
    return results

@app.post('/classify', response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    if not request.text.strip():
        raise HTTPException(400, 'text is required')
    
    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(
        _executor, _classify_sync, request.text, request.top_k, request.threshold
    )
    
    results = [
        CategoryMatch(category_id=cid, name=name, path=path, similarity=sim, depth=depth)
        for cid, name, path, sim, depth in raw
    ]
    
    return ClassifyResponse(source='local', results=results)

@app.get('/health')
async def health():
    return {'status': 'ok', 'vectors': len(_ids)}

# ─── 页面导航向量 ────────────────────────────────

NAV_PAGES: list[dict] = [
    {'name': '首页', 'aliases': ['主页', '发现', 'discover', '首页', '首页页面'], 'path': '/discover', 'title': '发现页'},
    {'name': '发布需求', 'aliases': ['发布', '发需求', '创建需求', '新建需求'], 'path': '/demands/create', 'title': '发布需求'},
    {'name': '我的需求', 'aliases': ['需求列表', '我的发布', '管理需求'], 'path': '/my-demands', 'title': '我的需求'},
    {'name': '订单', 'aliases': ['订单列表', '我的订单', '订单管理'], 'path': '/orders', 'title': '订单'},
    {'name': '设置', 'aliases': ['偏好设置', '个人设置', '账户设置'], 'path': '/settings', 'title': '设置'},
    {'name': '帮助', 'aliases': ['帮助文档', '使用帮助', '帮助中心'], 'path': '/help', 'title': '帮助文档'},
    {'name': '消息', 'aliases': ['私信', '聊天', '消息列表'], 'path': '/messages', 'title': '消息'},
    {'name': '卡池', 'aliases': ['资源池', '活池', '需求池'], 'path': '/card-pool', 'title': '卡池'},
    {'name': '死池', 'aliases': ['过期池'], 'path': '/card-pool/dead', 'title': '死池'},
    {'name': '认证中心', 'aliases': ['认证', '实名认证', '身份认证'], 'path': '/cert-center', 'title': '认证中心'},
    {'name': '圈子', 'aliases': ['社区', '社群'], 'path': '/circles', 'title': '圈子'},
    {'name': '福利中心', 'aliases': ['公益', '公益中心', '福利'], 'path': '/welfare', 'title': '公益中心'},
    {'name': '标签统计', 'aliases': ['市场分析', '标签', '统计'], 'path': '/tag-stats', 'title': '市场分析'},
    {'name': '交易记录', 'aliases': ['交易', '结算', '账单'], 'path': '/transactions', 'title': '交易记录'},
    {'name': '找人', 'aliases': ['搜索用户', '找师傅', '用户搜索'], 'path': '/search', 'title': '找人'},
    {'name': '个人主页', 'aliases': ['我的主页', '个人资料', '我的'], 'path': '/profile', 'title': '个人主页'},
    {'name': 'AI助手', 'aliases': ['AI', '机器人', '对话', '智能助手', '聊天机器人'], 'path': '/agent', 'title': 'AI 助手'},
    {'name': '后台管理', 'aliases': ['后台', '管理后台', '管理员', '管理员面板', 'dashboard'], 'path': '/dashboard', 'title': '后台管理'},
]

# 预计算所有页面的 embedding
_page_texts: list[str] = []
for p in NAV_PAGES:
    _page_texts.append(p['name'])
    _page_texts.extend(p['aliases'])
_page_embs = _model.encode(_page_texts, normalize_embeddings=True)
_page_offsets: list[tuple[int, int]] = []  # (start, end) per page
_offset = 0
for p in NAV_PAGES:
    n = 1 + len(p['aliases'])
    _page_offsets.append((_offset, _offset + n))
    _offset += n

class NavigateRequest(BaseModel):
    text: str
    threshold: float = 0.25

class NavigateMatch(BaseModel):
    name: str
    path: str
    title: str
    similarity: float

class NavigateResponse(BaseModel):
    source: str
    match: NavigateMatch | None
    candidates: list[NavigateMatch]

@app.post('/navigate', response_model=NavigateResponse)
async def navigate(request: NavigateRequest):
    """接收用户输入，返回最匹配的页面路由"""
    if not request.text.strip():
        raise HTTPException(400, 'text is required')

    loop = asyncio.get_event_loop()
    vec = await loop.run_in_executor(
        _executor, lambda: _model.encode([request.text], normalize_embeddings=True)
    )

    # 聚合每个页面的最高分（name + aliases 取 max）
    candidates: list[NavigateMatch] = []
    for i, p in enumerate(NAV_PAGES):
        start, end = _page_offsets[i]
        best = float(np.max(vec[0] @ _page_embs[start:end].T))
        if best >= request.threshold:
            candidates.append(NavigateMatch(
                name=p['name'], path=p['path'], title=p['title'], similarity=round(best, 4)
            ))

    candidates.sort(key=lambda x: x.similarity, reverse=True)
    return NavigateResponse(
        source='local',
        match=candidates[0] if candidates else None,
        candidates=candidates[:3],
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8001)
