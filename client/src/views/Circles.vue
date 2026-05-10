<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { circleApi } from '@/api/circle';
import { MessagePlugin } from 'tdesign-vue-next';
import UsergroupIcon from 'tdesign-icons-vue-next/esm/components/usergroup';
import AddIcon from 'tdesign-icons-vue-next/esm/components/add';
import LoadingState from '@/components/LoadingState.vue';
import ErrorState from '@/components/ErrorState.vue';
import EmptyState from '@/components/EmptyState.vue';

const router = useRouter();

const circles = ref<any[]>([]);
const myCircles = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const showCreate = ref(false);
const showJoin = ref(false);
const createForm = ref({ name: '', description: '' });
const joinCode = ref('');

const roleLabel: Record<string, string> = { OWNER: '圈主', ADMIN: '管理', MEMBER: '成员' };

async function fetchCircles() {
  loading.value = true; error.value = '';
  try {
    const [pubRes, myRes] = await Promise.all([circleApi.list(), circleApi.my()]);
    circles.value = pubRes.data.data;
    myCircles.value = myRes.data.data;
  } catch (e: any) { error.value = e.response?.data?.message || '加载失败'; }
  finally { loading.value = false; }
}

async function createCircle() {
  if (!createForm.value.name.trim()) return;
  try {
    await circleApi.create(createForm.value);
    MessagePlugin.success('圈子已创建');
    showCreate.value = false;
    createForm.value = { name: '', description: '' };
    fetchCircles();
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message || '创建失败'); }
}

async function joinByCode() {
  if (!joinCode.value.trim()) return;
  try {
    await circleApi.joinByCode(joinCode.value);
    MessagePlugin.success('已加入');
    showJoin.value = false; joinCode.value = '';
    fetchCircles();
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message || '加入失败'); }
}

onMounted(fetchCircles);
</script>

<template>
  <div class="circles-page">
    <ErrorState v-if="error" :message="error" @retry="fetchCircles" />
    <LoadingState v-else-if="loading" />

    <template v-else>
      <!-- Hero -->
      <section class="hero">
        <span class="hero-label">CIRCLES</span>
        <h1 class="hero-title">需求圈</h1>
        <p class="hero-sub">加入圈子，与同行交流，高效协作</p>
        <div class="hero-actions">
          <button class="hero-btn primary" @click="showCreate = true"><AddIcon size="18px" /> 创建圈子</button>
          <button class="hero-btn" @click="showJoin = true">邀请码加入</button>
        </div>
      </section>

      <!-- My Circles -->
      <section class="section" v-if="myCircles.length">
        <div class="section-header">
          <h2 class="section-title">我的圈子</h2>
        </div>
        <div class="card-row">
          <div v-for="m in myCircles" :key="m.circleId" class="circle-card" @click="router.push('/circles/' + m.circle?.id)">
            <div class="card-media" :style="m.circle?.coverUrl ? { backgroundImage: `url(${m.circle.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
              <span v-if="!m.circle?.coverUrl" class="card-letter">{{ m.circle?.name?.charAt(0) }}</span>
              <span class="card-badge">{{ roleLabel[m.role] }}</span>
            </div>
            <div class="card-info">
              <h3 class="card-name">{{ m.circle?.name }}</h3>
              <span class="card-stat"><UsergroupIcon size="13px" /> {{ m.circle?._count?.members || 1 }} 人</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Public Circles -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">发现圈子</h2>
          <span class="section-count" v-if="circles.length">{{ circles.length }} 个公开圈</span>
        </div>
        <div v-if="circles.length" class="card-row">
          <div v-for="c in circles" :key="c.id" class="circle-card" @click="router.push('/circles/' + c.id)">
            <div class="card-media" :style="c.coverUrl ? { backgroundImage: `url(${c.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
              <span v-if="!c.coverUrl" class="card-letter">{{ c.name?.charAt(0) }}</span>
              <span class="card-badge public">公开</span>
            </div>
            <div class="card-info">
              <h3 class="card-name">{{ c.name }}</h3>
              <span class="card-stat"><UsergroupIcon size="13px" /> {{ c._count?.members || 0 }} 人</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-row">暂无公开圈子</div>
      </section>

      <EmptyState v-if="myCircles.length === 0 && circles.length === 0" message="暂无圈子" action-label="创建第一个圈子" @action="showCreate = true" />
    </template>

    <!-- Create -->
    <t-dialog v-model:visible="showCreate" header="创建圈子" :footer="false">
      <div class="dialog-form">
        <t-input v-model="createForm.name" placeholder="圈子名称" />
        <t-textarea v-model="createForm.description" placeholder="简介（可选）" :autosize="{ minRows: 2, maxRows: 4 }" />
        <t-button theme="primary" block @click="createCircle">创建</t-button>
      </div>
    </t-dialog>

    <!-- Join -->
    <t-dialog v-model:visible="showJoin" header="邀请码加入" :footer="false">
      <div class="dialog-form">
        <t-input v-model="joinCode" placeholder="输入邀请码" @keyup.enter="joinByCode" />
        <t-button theme="primary" block @click="joinByCode">加入</t-button>
      </div>
    </t-dialog>
  </div>
</template>

<style scoped>
.circles-page { height: 100%; overflow-y: auto; background: var(--bg-primary); }
.circles-page::-webkit-scrollbar { width: 4px; }
.circles-page::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }

/* ── Hero ── */
.hero { padding: 44px 28px 36px; text-align: left; }
.hero-label { font-size: 11px; font-weight: 700; letter-spacing: 6px; color: var(--text-muted); display: block; margin-bottom: 12px; }
.hero-title { font-size: 34px; font-weight: 900; margin: 0 0 8px; letter-spacing: -0.5px; color: var(--text-primary); }
.hero-sub { font-size: 15px; color: var(--text-secondary); margin: 0 0 20px; }
.hero-actions { display: flex; gap: 10px; }
.hero-btn {
  padding: 10px 22px; border-radius: 10px; border: 1px solid var(--border-color);
  background: transparent; color: var(--text-primary); font-size: 14px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  font-family: var(--font-family); transition: all 0.2s;
}
.hero-btn:hover { border-color: var(--accent-color); color: var(--accent-color); }
.hero-btn.primary { border: none; background: #fff; color: #000; }
.hero-btn.primary:hover { opacity: 0.85; }

@media (min-width: 768px) { .hero { padding: 56px 40px 44px; } .hero-title { font-size: 44px; } }

/* ── Sections ── */
.section { padding: 0 20px 28px; }
.section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-size: 18px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: 1px; }
.section-count { font-size: 13px; color: var(--text-muted); }
.empty-row { padding: 20px 0; text-align: center; color: var(--text-muted); font-size: 14px; }

/* ── Cards ── */
.card-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(172px, 1fr)); gap: 12px; }
.circle-card {
  border-radius: 14px; overflow: hidden;
  background: var(--bg-card); border: 1px solid var(--border-color);
  cursor: pointer; transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.circle-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.15); box-shadow: 0 12px 40px rgba(0,0,0,0.25); }
.card-media {
  height: 68px; display: flex; align-items: center; justify-content: center; position: relative;
  background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
}
.card-letter { font-size: 22px; font-weight: 800; color: rgba(255,255,255,0.15); letter-spacing: 2px; }
.card-badge {
  position: absolute; top: 8px; right: 10px;
  padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;
  background: rgba(102,126,234,0.18); color: #a5b4fc;
  letter-spacing: 1px;
}
.card-badge.public { background: rgba(16,185,129,0.12); color: #34d399; }
.card-info { padding: 12px 14px 14px; }
.card-name { font-size: 14px; font-weight: 700; margin: 0 0 4px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-stat { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }

.dialog-form { display: flex; flex-direction: column; gap: 12px; }
</style>
