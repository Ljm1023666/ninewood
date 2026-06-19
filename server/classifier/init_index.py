"""
从 taxonomy-data.json 构建 SQLite 分类数据库 + FAISS 索引
"""
import sqlite3
import json
import os
import sys
import numpy as np
from pathlib import Path

# 路径
TAXONOMY_PATH = Path(__file__).parent.parent / 'src' / 'taxonomy-data.json'
DB_PATH = Path(__file__).parent / 'categories.db'
FAISS_INDEX_PATH = Path(__file__).parent / 'category_index.faiss'
IDS_PATH = Path(__file__).parent / 'category_ids.pkl'

def get_node_path(raw: dict, node_id: str) -> list[str]:
    """获取节点从根开始的路径标签"""
    labels = []
    current = node_id
    while current and current != 'root':
        node = raw.get(current)
        if not node:
            break
        labels.insert(0, node['label'])
        current = node.get('parent')
    return labels

def build_database():
    """从 taxonomy-data.json 构建分类数据库"""
    with open(TAXONOMY_PATH, 'r', encoding='utf-8') as f:
        raw = json.load(f)

    # 连接数据库
    if DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            keywords TEXT,
            description TEXT,
            path TEXT,
            depth INTEGER DEFAULT 0
        )
    ''')

    # 生成关键词、描述、路径
    for node_id, node in raw.items():
        if node_id == 'root':
            continue

        path_labels = get_node_path(raw, node_id)
        name = node['label']
        parent_id = node.get('parent')
        depth = len(path_labels)

        # 关键词 = 自身标签 + 父标签 + 常见别名
        keywords = [name]
        if len(path_labels) >= 2:
            keywords.append(path_labels[-2])  # 父节点标签
        if len(path_labels) >= 2:
            # 自身 + 父 组合
            keywords.append(path_labels[-2] + name)

        # 别名
        aliases = _get_aliases(name, path_labels[-2] if len(path_labels) >= 2 else None)
        keywords.extend(aliases)

        # 描述 = 路径 + 名称
        description = ' → '.join(path_labels)

        cursor.execute(
            'INSERT INTO categories (id, name, parent_id, keywords, description, path, depth) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (node_id, name, parent_id, ','.join(set(keywords)), description, '/'.join(path_labels), depth)
        )

    conn.commit()
    conn.close()
    print(f"[DB] Built {len(raw) - 1} categories → {DB_PATH}")

def _get_aliases(label: str, parent_label: str | None) -> list[str]:
    """为常见服务类型生成别名"""
    aliases = []
    l = label.lower()

    # 服务类型别名
    service_aliases = {
        '代练上分': ['代练', '代打', '上分', '冲分', '上段位', '上星'],
        '陪玩教学': ['陪玩', '陪练', '教学', '带玩', '带飞'],
        '账号交易': ['买号', '卖号', '账号', '租号'],
        '道具代币': ['皮肤', '点券', '道具', '代币'],
        '游戏直播': ['直播', '开播'],
    }
    for kw, al in service_aliases.items():
        if kw in label or kw in l:
            aliases.extend(al)

    # 游戏名称别名
    game_aliases = {
        '王者荣耀': ['王者', 'wzry'],
        '英雄联盟': ['lol', 'league'],
        '和平精英': ['pubg', '吃鸡'],
        '我的世界': ['mc', 'minecraft'],
    }
    for name, al in game_aliases.items():
        if name in label or name in l:
            aliases.extend(al)

    return aliases

def build_faiss_index():
    """用 embedding 模型生成向量并构建 FAISS 索引"""
    from sentence_transformers import SentenceTransformer

    print("[Model] Loading bge-small-zh-v1.5...")
    model = SentenceTransformer('BAAI/bge-small-zh-v1.5', device='cpu')

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, keywords, description FROM categories")
    rows = cursor.fetchall()

    ids = []
    texts = []
    for cat_id, name, keywords, desc in rows:
        text = f"{name} {' '.join(keywords.split(','))} {desc}"
        texts.append(text)
        ids.append(cat_id)

    print(f"[Model] Encoding {len(texts)} texts...")
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)

    # 构建 FAISS 索引
    import faiss
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings.astype(np.float32))

    faiss.write_index(index, str(FAISS_INDEX_PATH))
    import pickle
    with open(IDS_PATH, 'wb') as f:
        pickle.dump(ids, f)

    conn.close()
    print(f"[FAISS] Index built: {len(ids)} vectors, dim={dimension} → {FAISS_INDEX_PATH}")

if __name__ == '__main__':
    print("=== Step 1: Build Database ===")
    build_database()
    print("\n=== Step 2: Build FAISS Index ===")
    build_faiss_index()
    print("\n✅ Done!")
