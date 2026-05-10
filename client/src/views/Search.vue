<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { userApi } from '@/api/user';
import SearchIcon from 'tdesign-icons-vue-next/esm/components/search';
import CloseIcon from 'tdesign-icons-vue-next/esm/components/close';

const router = useRouter();

const keyword = ref('');
const results = ref<any[]>([]);
const loading = ref(false);
const searched = ref(false);

const certLabel: Record<string, string> = { NONE: '', BASIC: '初级', INTERMEDIATE: '中级', ADVANCED: '高级', MASTER: '顶级' };
function certColor(level: string) {
  const map: Record<string, string> = { ADVANCED: '#f59e0b', MASTER: '#ef4444', INTERMEDIATE: '#8b5cf6', BASIC: '#3b82f6', NONE: '#6b7280' };
  return map[level] || '#6b7280';
}

async function handleSearch() {
  const kw = keyword.value.trim();
  if (!kw) return;
  loading.value = true; searched.value = true;
  try {
    const res = await userApi.search(kw);
    results.value = res.data.data;
  } catch {
    results.value = [];
  } finally { loading.value = false; }
}

function goProfile(user: any) {
  router.push(`/profile/${user.id}`);
}
</script>

<template>
  <div class="search-page">
    <div class="search-bar">
      <div class="search-box">
        <SearchIcon class="s-icon" />
        <input
          v-model="keyword"
          class="s-input"
          placeholder="搜索用户昵称或手机号"
          @keyup.enter="handleSearch"
          autofocus
        />
        <button v-if="keyword" class="s-clear" @click="keyword = ''; results = []; searched = false">
          <CloseIcon size="14px" />
        </button>
      </div>
      <button class="s-btn" @click="handleSearch">搜索</button>
    </div>

    <div class="results">
      <div v-if="loading" class="status-text">搜索中...</div>

      <template v-else-if="searched">
        <div v-if="results.length === 0" class="status-text">未找到相关用户</div>

        <div
          v-for="u in results" :key="u.id"
          class="user-item"
          @click="goProfile(u)"
        >
          <div class="u-avatar" :style="{ background: certColor(u.certificationLevel) }">
            <img v-if="u.avatarUrl" :src="u.avatarUrl" class="u-avatar-img" />
            <span v-else>{{ u.nickname?.charAt(0) }}</span>
          </div>
          <div class="u-body">
            <div class="u-name">{{ u.nickname }}</div>
            <div v-if="u.bio" class="u-bio">{{ u.bio.slice(0, 40) }}</div>
          </div>
          <div class="u-cert" :style="{ color: certColor(u.certificationLevel) }">
            {{ certLabel[u.certificationLevel] || '' }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  height: 100%; overflow-y: auto;
  background: var(--bg-primary);
  display: flex; flex-direction: column;
}

.search-bar {
  display: flex; gap: 8px; padding: 12px 16px;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}
.search-box {
  flex: 1; display: flex; align-items: center; gap: 8px;
  background: var(--bg-secondary); border-radius: 8px;
  padding: 8px 12px;
}
.s-icon { color: var(--text-muted); font-size: 16px; flex-shrink: 0; }
.s-input {
  flex: 1; background: none; border: none; outline: none;
  color: var(--text-primary); font-size: 15px;
}
.s-input::placeholder { color: var(--text-muted); }
.s-clear { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; }
.s-btn {
  padding: 8px 16px; border: none; border-radius: 8px;
  background: var(--primary-gradient); color: #fff;
  font-size: 14px; font-weight: 600; cursor: pointer;
}

.results { flex: 1; overflow-y: auto; }
.status-text {
  text-align: center; padding: 60px 20px;
  color: var(--text-muted); font-size: 14px;
}

.user-item {
  display: flex; gap: 12px; padding: 14px 20px;
  align-items: center; cursor: pointer;
  transition: background 0.12s;
}
.user-item:hover { background: var(--bg-secondary); }

.u-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 18px; font-weight: 700; flex-shrink: 0;
  overflow: hidden;
}
.u-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.u-body { flex: 1; min-width: 0; }
.u-name { font-size: 15px; color: var(--text-primary); font-weight: 500; }
.u-bio { font-size: 12px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.u-cert { font-size: 11px; font-weight: 600; flex-shrink: 0; }
</style>
