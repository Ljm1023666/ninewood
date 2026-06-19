<script setup lang="ts">
import { useRouter } from 'vue-router';
import LightingCircleIcon from 'tdesign-icons-vue-next/esm/components/lighting-circle';
import TaskIcon from 'tdesign-icons-vue-next/esm/components/task';
import CertificateIcon from 'tdesign-icons-vue-next/esm/components/certificate';
import Edit1Icon from 'tdesign-icons-vue-next/esm/components/edit-1';
import ShopIcon from 'tdesign-icons-vue-next/esm/components/shop';
import File1Icon from 'tdesign-icons-vue-next/esm/components/file-1';
import ChatIcon from 'tdesign-icons-vue-next/esm/components/chat';
import SettingIcon from 'tdesign-icons-vue-next/esm/components/setting';
import EditIcon from 'tdesign-icons-vue-next/esm/components/edit';
import AnimateOnScroll from '@/components/AnimateOnScroll.vue';
import { certLabel, certColor } from '@/constants/cert';

const props = defineProps<{
  user: any;
  isMe: boolean;
  followCounts: { following: number; followers: number };
  certStatus: any;
  orderTarget: number;
  snatchMax: number;
}>();

const emit = defineEmits<{ 'start-edit': []; 'show-follow': [mode: 'followers' | 'following'] }>();

const router = useRouter();
const level = props.user?.certificationLevel || 'NONE';

const completedOrders = props.user?.completedOrders || 0;
const orderProgress = Math.min((completedOrders / props.orderTarget) * 100, 100);
const creditScore = props.user?.creditScore || 0;
const snatchCredits = props.user?.snatchCredits || 0;
const snatchProgress = (snatchCredits / props.snatchMax) * 100;
const certProgress = props.certStatus?.promotion?.progress
  ? Math.round(props.certStatus.promotion.progress * 100)
  : 0;
const nextCert = props.certStatus?.promotion?.next
  ? certLabel[props.certStatus.promotion.next] || ''
  : '';

const followRatio = props.followCounts.followers > 0
  ? Math.round((props.followCounts.following / props.followCounts.followers) * 100)
  : 0;
</script>

<template>
  <!-- Activity Stats -->
  <AnimateOnScroll animation="fadeUp" :delay="100">
    <div class="stats-section">
    <div class="section-header">
      <LightingCircleIcon class="section-icon" />
      <span class="section-title">社交</span>
      <span class="section-line" />
    </div>
    <div class="stats-grid social-grid">
      <div class="stat-card clickable" @click="emit('show-follow', 'following')">
        <div class="stat-num">{{ followCounts.following }}</div>
        <div class="stat-desc">关注</div>
      </div>
      <div class="stat-card clickable" @click="emit('show-follow', 'followers')">
        <div class="stat-num">{{ followCounts.followers }}</div>
        <div class="stat-desc">粉丝</div>
      </div>
    </div>
  </div>
  </AnimateOnScroll>

  <!-- Service Stats -->
  <AnimateOnScroll animation="fadeUp" :delay="200">
    <div class="stats-section">
    <div class="section-header">
      <LightingCircleIcon class="section-icon" />
      <span class="section-title">服务数据</span>
      <span class="section-line" />
    </div>

    <!-- Cert Progress Ring -->
    <div v-if="certStatus?.promotion" class="cert-progress-ring">
      <svg class="ring-svg" viewBox="0 0 100 100">
        <circle class="ring-bg" cx="50" cy="50" r="42" />
        <circle
          class="ring-fill"
          cx="50" cy="50" r="42"
          :stroke="certColor[certStatus.promotion.next] || certColor[level]"
          :style="{ strokeDashoffset: 264 - (264 * certProgress) / 100 }"
        />
      </svg>
      <div class="ring-center">
        <span class="ring-pct">{{ certProgress }}%</span>
        <span class="ring-label">升级进度</span>
        <span v-if="nextCert" class="ring-next" :style="{ color: certColor[certStatus.promotion.next] || certColor[level] }">{{ nextCert }}</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-num" :style="{ color: certColor[level] }">{{ completedOrders }}</div>
        <div class="stat-desc">完成订单</div>
        <div class="stat-bar"><div class="stat-fill" :style="{ width: orderProgress + '%', background: certColor[level] }" /></div>
      </div>
      <div class="stat-card">
        <div class="stat-num credit-num">{{ creditScore }}</div>
        <div class="stat-desc">信誉积分 <span class="stat-hint">满分100</span></div>
        <div class="stat-bar"><div class="stat-fill credit-fill" :style="{ width: creditScore + '%' }" /></div>
      </div>
      <div class="stat-card">
        <div class="stat-num snatch-num">{{ snatchCredits }}<span class="stat-unit">/{{ snatchMax }}</span></div>
        <div class="stat-desc">本月抢单</div>
        <div class="stat-bar"><div class="stat-fill snatch-fill" :style="{ width: snatchProgress + '%' }" /></div>
      </div>
      <!-- Follow ratio -->
      <div class="stat-card">
        <div class="stat-num follow-num">{{ followRatio }}<span class="stat-unit">%</span></div>
        <div class="stat-desc">关注/粉丝比</div>
        <div class="stat-bar"><div class="stat-fill follow-fill" :style="{ width: Math.min(followRatio, 100) + '%' }" /></div>
      </div>
    </div>
  </div>
  </AnimateOnScroll>

  <!-- Menu -->
  <AnimateOnScroll animation="fadeUp" :delay="300">
    <div v-if="isMe" class="menu-section">
    <div class="section-header">
      <TaskIcon class="section-icon" />
      <span class="section-title">功能</span>
      <span class="section-line" />
    </div>
    <div class="menu-grid">
      <button class="menu-card" @click="router.push('/cert-center')">
        <CertificateIcon class="menu-icon" />
        <span class="menu-label">认证中心</span>
      </button>
      <button class="menu-card" @click="router.push('/my-demands')">
        <Edit1Icon class="menu-icon" />
        <span class="menu-label">我的需求</span>
      </button>
      <button class="menu-card" @click="router.push('/orders?role=provider')">
        <ShopIcon class="menu-icon" />
        <span class="menu-label">我接的单</span>
      </button>
      <button class="menu-card" @click="router.push('/orders?role=requester')">
        <File1Icon class="menu-icon" />
        <span class="menu-label">我发的单</span>
      </button>
      <button class="menu-card" @click="router.push('/messages')">
        <ChatIcon class="menu-icon" />
        <span class="menu-label">消息</span>
      </button>
      <button class="menu-card" @click="router.push('/settings')">
        <SettingIcon class="menu-icon" />
        <span class="menu-label">设置</span>
      </button>
    </div>
    <button v-if="isMe" class="edit-profile-btn" @click="$emit('start-edit')">
      <EditIcon size="15px" /> 编辑资料
    </button>
  </div>
  </AnimateOnScroll>
</template>

<style scoped>
.stats-section, .menu-section {
  position: relative; z-index: 1; padding: 0 20px 20px;
  --credit-color: #10b981;
  --snatch-color: #ef4444;
  --follow-color: #a78bfa;
}
.section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.section-icon { font-size: 16px; color: var(--text-secondary); flex-shrink: 0; }
.section-title { font-size: 14px; font-weight: 700; color: var(--text-secondary); letter-spacing: 2px; flex-shrink: 0; }
.section-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border-color), transparent); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.social-grid { max-width: 360px; margin: 0 auto; }
.stat-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 14px;
  transition: all 0.2s ease;
}
.stat-card.clickable { cursor: pointer; }
.stat-card.clickable:hover { border-color: var(--accent-color); background: var(--bg-tertiary); transform: translateY(-1px); }
.stat-num { font-size: 28px; font-weight: 900; color: var(--text-primary); line-height: 1; animation: numReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.credit-num { color: var(--credit-color); }
.snatch-num { color: var(--snatch-color); }
.follow-num { color: var(--follow-color); }
.credit-fill { background: var(--credit-color); }
.snatch-fill { background: var(--snatch-color); }
.follow-fill { background: var(--follow-color); }
.stat-unit { font-size: 14px; font-weight: 500; color: var(--text-muted); margin-left: 2px; }
.stat-desc { font-size: 11px; color: var(--text-secondary); margin: 6px 0 10px; }

/* ── Cert progress ring ── */
.cert-progress-ring {
  display: flex; justify-content: center; margin-bottom: 16px;
}
.ring-svg {
  width: 120px; height: 120px; transform: rotate(-90deg);
}
.ring-bg {
  fill: none; stroke: var(--bg-tertiary); stroke-width: 6;
}
.ring-fill {
  fill: none; stroke-width: 6; stroke-linecap: round;
  stroke-dasharray: 264; stroke-dashoffset: 264;
  transition: stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 0 6px currentColor);
}
.ring-center {
  position: absolute;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 120px; height: 120px;
}
.cert-progress-ring { position: relative; }
.ring-pct { font-size: 26px; font-weight: 900; color: var(--text-primary); line-height: 1; }
.ring-label { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.ring-next { font-size: 11px; font-weight: 700; margin-top: 2px; }
.stat-hint { font-weight: 400; font-size: 10px; color: var(--text-muted); }
.stat-bar { height: 3px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden; }
.stat-fill { height: 100%; border-radius: 2px; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }

.menu-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
.menu-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); cursor: pointer; transition: all 0.2s;
  color: var(--text-primary); font-family: inherit;
}
.menu-card:hover { border-color: var(--accent-color); background: var(--bg-tertiary); transform: translateY(-1px); }
.menu-icon { font-size: 22px; color: var(--accent-color); }
.menu-label { font-size: 12px; color: var(--text-secondary); }
.edit-profile-btn {
  width: 100%; padding: 12px; border-radius: var(--radius);
  background: var(--bg-card); border: 1px solid var(--border-color); color: var(--accent-color);
  font-size: 14px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-family: inherit;
}
.edit-profile-btn:hover { background: var(--bg-tertiary); }
</style>
