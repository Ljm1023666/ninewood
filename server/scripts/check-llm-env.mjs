import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(dir, '..', '.env');
dotenv.config({ path: envPath });

const names = ['AI_API_KEY', 'DS_API_KEY', 'QWEN_API_KEY'];
for (const n of names) {
  const v = process.env[n] || '';
  console.log(`${n}: ${v.length ? `已设置 (${v.length} 字符)` : '空'}`);
}

const providers = [
  {
    id: 'minimax',
    key: process.env.AI_API_KEY,
    url: process.env.AI_BASE_URL || 'https://api.minimax.chat/v1',
    model: process.env.AI_MODEL || 'MiniMax-M2.5',
  },
  {
    id: 'deepseek',
    key: process.env.DS_API_KEY,
    url: process.env.DS_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DS_MODEL || 'deepseek-chat',
  },
  {
    id: 'qwen',
    key: process.env.QWEN_API_KEY,
    url: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: process.env.QWEN_MODEL || 'qwen3.7-plus',
  },
];

const configured = providers.filter((p) => p.key && p.key.length > 8);
if (!configured.length) {
  console.log('\n未检测到有效 Key，请确认 server/.env 已保存且变量名正确。');
  process.exit(1);
}

console.log('\n连通性探测:');
for (const p of configured) {
  try {
    const base = p.url.replace(/\/$/, '');
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p.key}`,
      },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    const snippet = (await r.text()).slice(0, 100);
    console.log(`  ${p.id}: ${r.ok ? 'OK' : 'FAIL'} HTTP ${r.status}${r.ok ? '' : ' — ' + snippet}`);
  } catch (e) {
    console.log(`  ${p.id}: ERROR — ${e.message}`);
  }
}
