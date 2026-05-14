<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { userApi } from '@/api/user';
import { MessagePlugin } from 'tdesign-vue-next';
import { certLabel, certColor } from '@/constants/cert';

const router = useRouter();

const certStatus = ref<any>(null);
const loading = ref(false);

const steps = [
  { level: 'NONE', label: '未认证', desc: '初始状态' },
  { level: 'BASIC', label: '初级认证', desc: '完成 5 次服务' },
  { level: 'INTERMEDIATE', label: '中级认证', desc: '完成 20 次服务' },
  { level: 'ADVANCED', label: '高级认证', desc: '完成 50 次服务' },
];

const currentIdx = computed(() => {
  if (!certStatus.value) return 0;
  return steps.findIndex(s => s.level === certStatus.value.certificationLevel);
});
const nextIdx = computed(() => currentIdx.value + 1);
const hasPromotion = computed(() => certStatus.value?.promotion);
const currentColor = computed(() => certColor[certStatus.value?.certificationLevel || 'NONE']);

async function fetchStatus() {
  try {
    const res = await userApi.certStatus();
    certStatus.value = res.data.data;
  } catch {}
}

async function upgrade() {
  loading.value = true;
  try {
    await userApi.upgradeCert();
    MessagePlugin.success('升级成功');
    await fetchStatus();
  } catch (e: any) {
    MessagePlugin.error(e.response?.data?.message || '升级失败');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchStatus);
</script>

<template>
  <div class="cert-page thin-scroll">
    <!-- Hero -->
    <section class="hero">
      <span class="hero-label">CERTIFICATION</span>
      <h1 class="hero-title">认证中心</h1>
    </section>

    <!-- Current Level Display -->
    <section class="level-card" v-if="certStatus">
      <div class="level-glow" :style="{ background: `radial-gradient(ellipse at 30% 20%, ${currentColor}18 0%, transparent 60%)` }" />
      <div class="level-main">
        <div class="level-badge" :style="{ background: currentColor }">
          {{ certLabel[certStatus.certificationLevel] }}
        </div>
        <div class="level-stats">
          <div class="stat">
            <span class="stat-num">{{ certStatus.completedOrders }}</span>
            <span class="stat-label">已完成</span>
          </div>
          <div class="stat-divider" />
          <div class="stat">
            <span class="stat-num">{{ certStatus.snatchCredits }}</span>
            <span class="stat-label">本月抢单</span>
          </div>
          <div class="stat-divider" />
          <div class="stat">
            <span class="stat-num">{{ certStatus.creditScore }}</span>
            <span class="stat-label">信誉分</span>
          </div>
        </div>
      </div>

      <!-- Promotion -->
      <div v-if="hasPromotion" class="promo">
        <div class="promo-header">
          <span class="promo-label">升级进度</span>
          <span class="promo-target" :style="{ color: certColor[certStatus.promotion.next] }">
            {{ certLabel[certStatus.promotion.next] }}
          </span>
        </div>
        <div class="promo-bar-wrap">
          <div class="promo-bar">
            <div
              class="promo-fill"
              :style="{ width: `${Math.round(certStatus.promotion.progress * 100)}%`, background: certColor[certStatus.promotion.next] }"
            />
          </div>
          <span class="promo-pct">{{ Math.round(certStatus.promotion.progress * 100) }}%</span>
        </div>
        <p class="promo-desc">还需完成 <strong>{{ certStatus.promotion.needed - certStatus.completedOrders }}</strong> 次服务即可升级</p>
        <button
          class="upgrade-btn"
          :style="{ background: certColor[certStatus.promotion.next] }"
          :disabled="certStatus.promotion.progress < 1 || loading"
          @click="upgrade"
        >
          {{ loading ? '升级中...' : '申请升级' }}
        </button>
      </div>
      <div v-else class="promo max-level">
        <span class="max-badge">已达成最高等级</span>
      </div>
    </section>

    <!-- Steps -->
    <section class="steps-section">
      <h2 class="steps-title">认证路径</h2>
      <div class="steps-track">
        <div
          v-for="(step, idx) in steps"
          :key="step.level"
          class="step-item"
          :class="{ done: idx <= currentIdx, current: idx === currentIdx }"
          :style="{ '--color': certColor[step.level] }"
        >
          <div class="step-marker">
            <div class="step-dot" />
            <div v-if="idx < steps.length - 1" class="step-line" :class="{ filled: idx < currentIdx }" />
          </div>
          <div class="step-body">
            <span class="step-name">{{ step.label }}</span>
            <span class="step-desc">{{ step.desc }}</span>
          </div>
        </div>
      </div>
    </section>

    <router-link to="/intro" class="about-link">了解认证体系 →</router-link>
  </div>
</template>

<style scoped>
.cert-page {
  height: 100%; overflow-y: auto;
  background: var(--bg-primary);
  padding-bottom: 48px;
}

/* ── Hero ── */
.hero {
  padding: 80px 28px 32px;
}
.hero-label {
  font-size: 12px; font-weight: 700; letter-spacing: 6px;
  color: var(--text-muted); margin-bottom: 12px; display: block;
}
.hero-title {
  font-size: 32px; font-weight: 900; margin: 0;
  letter-spacing: 1px;
}
@media (min-width: 768px) {
  .hero { padding: 100px 40px 40px; }
  .hero-title { font-size: 42px; }
}

/* ── Level Card ── */
.level-card {
  position: relative;
  margin: 0 20px 32px; padding: 28px 24px;
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  overflow: hidden;
}
.level-glow {
  position: absolute; inset: 0; pointer-events: none;
}
.level-main {
  position: relative; z-index: 1;
}
.level-badge {
  display: inline-block; padding: 10px 24px; border-radius: 999px;
  font-size: 15px; font-weight: 800; color: #fff; letter-spacing: 3px;
  margin-bottom: 24px;
}
.level-stats {
  display: flex; gap: 0;
}
.stat {
  flex: 1; text-align: center;
}
.stat-num {
  display: block; font-size: 28px; font-weight: 900;
  color: var(--text-primary); line-height: 1;
}
.stat-label {
  display: block; margin-top: 6px;
  font-size: 12px; color: var(--text-muted); letter-spacing: 1px;
}
.stat-divider {
  width: 1px; align-self: stretch;
  background: var(--border-color);
}

/* ── Promotion ── */
.promo {
  position: relative; z-index: 1;
  margin-top: 24px; padding-top: 24px;
  border-top: 1px solid var(--border-color);
}
.promo-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.promo-label { font-size: 13px; color: var(--text-secondary); }
.promo-target { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
.promo-bar-wrap {
  display: flex; align-items: center; gap: 12px;
}
.promo-bar {
  flex: 1; height: 6px; border-radius: 3px;
  background: var(--bg-secondary); overflow: hidden;
}
.promo-fill {
  height: 100%; border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.32, 0.72, 0, 1);
}
.promo-pct {
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  min-width: 36px; text-align: right;
}
.promo-desc {
  margin: 10px 0 16px; font-size: 13px; color: var(--text-muted);
}
.promo-desc strong { color: var(--text-primary); }
.upgrade-btn {
  width: 100%; padding: 14px; border: none; border-radius: 12px;
  color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
  letter-spacing: 2px; transition: opacity 0.2s;
  font-family: var(--font-family);
}
.upgrade-btn:hover { opacity: 0.9; }
.upgrade-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.max-level {
  text-align: center; padding-top: 20px; border-top: 1px solid var(--border-color);
}
.max-badge {
  font-size: 14px; color: var(--text-muted); font-weight: 600; letter-spacing: 2px;
}

/* ── Steps ── */
.steps-section {
  padding: 0 20px 32px;
}
.steps-title {
  font-size: 18px; font-weight: 800; margin: 0 0 20px;
  letter-spacing: 2px;
}
.steps-track {
  display: flex; flex-direction: column; gap: 0;
}
.step-item {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 14px 0;
}
.step-marker {
  position: relative; width: 20px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
}
.step-dot {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  margin-top: 2px; flex-shrink: 0;
  transition: all 0.3s ease;
}
.step-item.done .step-dot {
  border-color: var(--color); background: var(--color);
  box-shadow: 0 0 8px var(--color);
}
.step-item.current .step-dot {
  width: 18px; height: 18px; margin-top: 0;
  border-color: var(--color); background: transparent;
  box-shadow: 0 0 16px var(--color);
}
.step-line {
  flex: 1; width: 2px; background: var(--border-color);
  min-height: 20px; margin-top: 4px;
}
.step-line.filled { background: var(--color); }
.step-body {
  display: flex; flex-direction: column; gap: 2px;
  padding-top: 0;
}
.step-name {
  font-size: 15px; font-weight: 700; color: var(--text-primary);
  transition: color 0.3s;
}
.step-item.done .step-name { color: var(--color); }
.step-item.current .step-name { color: var(--color); }
.step-desc {
  font-size: 13px; color: var(--text-muted);
}
.step-item:not(.done) .step-name { color: var(--text-muted); }

/* ── About Link ── */
.about-link {
  display: block; margin: 0 20px; padding: 16px;
  border-radius: 12px; border: 1px solid var(--border-color);
  text-align: center; font-size: 14px; color: var(--accent-color);
  text-decoration: none; font-weight: 600;
  transition: background 0.2s;
}
.about-link:hover { background: var(--bg-card); }
</style>
