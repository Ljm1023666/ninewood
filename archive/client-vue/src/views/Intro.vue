<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const activeTier = ref(0);

const tiers = [
  {
    level: 'NONE',
    title: '未认证',
    subtitle: '从这里出发',
    desc: '注册即享基础服务，浏览需求、发布需求，开启你的九木之旅。',
    color: '#6b7280',
    tag: '起步',
  },
  {
    level: 'BASIC',
    title: '初级认证',
    subtitle: '完成 5 次服务',
    desc: '解锁抢单功能，获得优先展示权，让更多人看到你的专业能力。',
    color: '#3b82f6',
    tag: '入门',
  },
  {
    level: 'INTERMEDIATE',
    title: '中级认证',
    subtitle: '完成 20 次服务',
    desc: '专属接单特权，更高的曝光权重，社区影响力持续提升。',
    color: '#8b5cf6',
    tag: '进阶',
  },
  {
    level: 'ADVANCED',
    title: '高级认证',
    subtitle: '完成 50 次服务',
    desc: '最高优先级展示，自由选择心仪需求，成为平台核心力量。',
    color: '#f59e0b',
    tag: '巅峰',
  },
];
</script>

<template>
  <div class="intro-page">
    <button class="back-btn" @click="router.back()">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-label">NINEWOOD</div>
      <h1 class="hero-title">每一份技能<br />都值得被看见</h1>
      <p class="hero-sub">认证体系带你从起步走向巅峰</p>
    </section>

    <!-- Tier Showcase -->
    <section class="tier-showcase">
      <!-- Tab row -->
      <div class="tier-tabs">
        <button
          v-for="(t, idx) in tiers"
          :key="t.level"
          class="tier-tab"
          :class="{ active: activeTier === idx }"
          :style="{ '--color': t.color }"
          @click="activeTier = idx"
        >
          <span class="tab-dot" />
          <span class="tab-label">{{ t.tag }}</span>
        </button>
      </div>

      <!-- Active card -->
      <div class="tier-card" :key="activeTier">
        <div class="card-visual">
          <div class="card-level-badge" :style="{ background: tiers[activeTier].color }">
            {{ tiers[activeTier].tag }}
          </div>
          <div class="card-visual-fill" :style="{ background: `linear-gradient(135deg, ${tiers[activeTier].color}22, ${tiers[activeTier].color}06)` }" />
        </div>
        <div class="card-body">
          <span class="card-tag" :style="{ color: tiers[activeTier].color, borderColor: tiers[activeTier].color }">{{ tiers[activeTier].subtitle }}</span>
          <h2 class="card-title" :style="{ color: tiers[activeTier].color }">{{ tiers[activeTier].title }}</h2>
          <p class="card-desc">{{ tiers[activeTier].desc }}</p>
        </div>
      </div>

      <!-- Progress indicator -->
      <div class="tier-progress">
        <div
          v-for="(t, idx) in tiers"
          :key="t.level"
          class="progress-step"
          :class="{ active: idx <= activeTier, current: idx === activeTier }"
          :style="{ '--color': t.color }"
          @click="activeTier = idx"
        >
          <div class="progress-dot" />
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${(activeTier / (tiers.length - 1)) * 100}%` }" />
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.intro-page {
  position: fixed; inset: 0;
  overflow-y: auto; overflow-x: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* ── Back ── */
.back-btn {
  position: fixed; top: 12px; left: 12px; z-index: 100;
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%;
  color: #fff; cursor: pointer; backdrop-filter: blur(8px);
}
.back-btn:hover { background: rgba(255,255,255,0.1); }

/* ── Hero ── */
.hero {
  padding: 80px 28px 40px;
  text-align: left;
}
.hero-label {
  font-size: 12px; font-weight: 700; letter-spacing: 6px;
  color: var(--text-muted); margin-bottom: 20px;
}
.hero-title {
  font-size: 38px; font-weight: 900; margin: 0 0 16px;
  letter-spacing: -0.5px; line-height: 1.18;
  color: var(--text-primary);
}
.hero-sub {
  font-size: 16px; color: var(--text-secondary); margin: 0;
  font-weight: 400;
}

@media (min-width: 768px) {
  .hero { padding: 100px 40px 60px; }
  .hero-title { font-size: 52px; }
}

/* ── Tier Showcase ── */
.tier-showcase {
  padding: 0 20px 32px;
  max-width: 680px;
  margin: 0 auto;
}

/* Tabs */
.tier-tabs {
  display: flex; gap: 0;
  border-radius: 12px; overflow: hidden;
  border: 1px solid var(--border-color);
  margin-bottom: 24px;
}
.tier-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 12px 8px; border: none; background: transparent;
  color: var(--text-muted); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.25s;
  font-family: var(--font-family);
}
.tier-tab.active {
  background: var(--bg-card); color: #fff;
}
.tab-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--color);
}
.tab-label { letter-spacing: 1px; }

/* Card */
.tier-card {
  border-radius: 20px; overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  transition: all 0.35s ease;
}
.card-visual {
  position: relative;
  height: 180px;
  display: flex; align-items: center; justify-content: center;
}
.card-visual-fill {
  position: absolute; inset: 0;
}
.card-level-badge {
  position: relative; z-index: 1;
  padding: 10px 28px; border-radius: 999px;
  font-size: 16px; font-weight: 800; color: #fff;
  letter-spacing: 6px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.card-body {
  padding: 24px 24px 28px;
}
.card-tag {
  display: inline-block; padding: 4px 12px; border-radius: 4px;
  font-size: 11px; font-weight: 700; letter-spacing: 2px;
  border: 1px solid; margin-bottom: 12px;
}
.card-title {
  font-size: 26px; font-weight: 900; margin: 0 0 10px;
}
.card-desc {
  font-size: 14px; color: var(--text-secondary);
  line-height: 1.7; margin: 0;
}

/* Progress */
.tier-progress {
  position: relative;
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 28px; padding: 0 4px; height: 20px;
}
.progress-track {
  position: absolute; top: 50%; left: 8px; right: 8px; height: 2px;
  background: var(--border-color); transform: translateY(-50%);
  border-radius: 1px;
}
.progress-fill {
  height: 100%; border-radius: 1px;
  background: var(--primary-gradient);
  transition: width 0.35s ease;
}
.progress-step {
  position: relative; z-index: 1;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; border-radius: 50%;
  transition: background 0.25s;
}
.progress-step:hover { background: rgba(255,255,255,0.05); }
.progress-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--border-color);
  transition: all 0.35s ease;
}
.progress-step.active .progress-dot {
  background: var(--color);
  box-shadow: 0 0 8px var(--color);
}
.progress-step.current .progress-dot {
  width: 14px; height: 14px;
  background: var(--color);
  box-shadow: 0 0 12px var(--color);
}

</style>
