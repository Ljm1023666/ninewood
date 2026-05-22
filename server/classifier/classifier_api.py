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

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8001)
