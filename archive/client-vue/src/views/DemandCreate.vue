<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { demandApi } from '@/api/demand';
import { MessagePlugin } from 'tdesign-vue-next';
import divisionTree from 'china-division/dist/pca-code.json';
import AddIcon from 'tdesign-icons-vue-next/esm/components/add';
import CloseIcon from 'tdesign-icons-vue-next/esm/components/close';
import ImageIcon from 'tdesign-icons-vue-next/esm/components/image';
import VideoIcon from 'tdesign-icons-vue-next/esm/components/video';
import MoneyIcon from 'tdesign-icons-vue-next/esm/components/money';

const router = useRouter();
const route = useRoute();

const desc = ref('');
const price = ref<number | null>(null);
const serviceType = ref<'ONLINE' | 'OFFLINE'>('ONLINE');
const province = ref('');
const city = ref('');
const district = ref('');
const expireDays = ref(3);
const showSettings = ref(false);
const submitting = ref(false);

// Demand status
const activeCount = ref(0);
const hasFrozen = ref(false);
const MAX_ACTIVE = 3;
const depositRate = 0.01;
const deposit = computed(() => price.value ? Math.max(1, Math.round(price.value * depositRate)) : 0);
const atLimit = computed(() => activeCount.value >= MAX_ACTIVE);

async function checkDemandStatus() {
  try {
    const res = await demandApi.getMyStatus?.();
    if (res) {
      activeCount.value = res.data.data?.activeCount || 0;
      hasFrozen.value = res.data.data?.hasFrozen || false;
    }
  } catch { /* best-effort */ }
}
onMounted(checkDemandStatus);

interface AreaItem {
  code: string; name: string; children?: AreaItem[];
}
const provinceData = divisionTree as AreaItem[];

const selProvince = computed(() => provinceData.find(p => p.code === province.value));
const selCities = computed(() => selProvince.value?.children || []);
const selCity = computed(() => selCities.value.find(c => c.code === city.value));
const selDistricts = computed(() => selCity.value?.children || []);

// Tags
const tagInput = ref('');
const tags = ref<string[]>([]);

function addTag() {
  const t = tagInput.value.trim();
  if (t && !tags.value.includes(t) && tags.value.length < 5) {
    tags.value.push(t);
    tagInput.value = '';
  }
}
function removeTag(idx: number) {
  tags.value.splice(idx, 1);
}

const canSubmit = computed(() =>
  desc.value.trim().length >= 1 &&
  price.value != null && price.value >= 1 &&
  !submitting.value
);

// Images / Video
const images = ref<File[]>([]);
const video = ref<File | null>(null);
const imagePreviews = ref<string[]>([]);
const videoPreview = ref('');

function onImagesChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (const f of Array.from(files)) {
    images.value.push(f);
    imagePreviews.value.push(URL.createObjectURL(f));
  }
}
function onVideoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  video.value = file;
  videoPreview.value = URL.createObjectURL(file);
}
function removeImage(idx: number) {
  images.value.splice(idx, 1);
  imagePreviews.value.splice(idx, 1);
}
function removeVideo() {
  video.value = null;
  videoPreview.value = '';
}

const stepIndex = computed(() => {
  if (!desc.value.trim()) return 0;
  if (price.value == null || price.value < 1) return 1;
  return 2;
});

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const fd = new FormData();
    fd.append('title', desc.value.trim().slice(0, 30));
    fd.append('description', desc.value.trim());
    fd.append('minPrice', String(price.value));
    fd.append('category', tags.value.join(',') || '其他');
    fd.append('serviceType', serviceType.value);
    fd.append('cityCode', district.value || city.value || province.value || '');
    const exp = new Date();
    exp.setDate(exp.getDate() + expireDays.value);
    fd.append('expireAt', exp.toISOString());
    if (route.query.circleId) fd.append('circleId', route.query.circleId as string);
    images.value.forEach(f => fd.append('images', f));
    if (video.value) fd.append('video', video.value);

    await demandApi.create(fd);
    MessagePlugin.success('发布成功');
    router.replace('/my-demands');
  } catch (e: any) {
    MessagePlugin.error(e.response?.data?.message || '发布失败');
  } finally { submitting.value = false; }
}
</script>

<template>
  <div class="create-page">
    <!-- Page glow -->
    <div class="page-glow" aria-hidden="true" />

    <div class="form-scroll thin-scroll">
      <!-- ── Hero header ── -->
      <div class="create-hero">
        <div class="hero-icon-wrap">
          <AddIcon class="hero-icon" />
        </div>
        <h1 class="hero-title">发布需求</h1>
        <p class="hero-sub">描述你的需求，让高手来帮你</p>
        <!-- Step Dots -->
        <div class="step-row">
          <div class="step-dot" :class="{ done: stepIndex >= 0, active: stepIndex === 0 }">1</div>
          <div class="step-line" :class="{ done: stepIndex >= 1 }" />
          <div class="step-dot" :class="{ done: stepIndex >= 1, active: stepIndex === 1 }">2</div>
          <div class="step-line" :class="{ done: stepIndex >= 2 }" />
          <div class="step-dot" :class="{ done: stepIndex >= 2, active: stepIndex === 2 }">3</div>
        </div>
        <p class="step-hint">
          {{ stepIndex === 0 ? '描述需求' : stepIndex === 1 ? '设置报酬' : '准备发布' }}
        </p>
      </div>

      <!-- ── Status & Frozen warnings ── -->
      <div v-if="atLimit" class="limit-banner">
        <span>已发布 {{ activeCount }}/{{ MAX_ACTIVE }}，已达上限</span>
      </div>
      <div v-if="hasFrozen" class="demand-frozen-banner">
        <span>⚠️ 有冻结中的需求，请先在「我的需求」中处理后再发布</span>
      </div>

      <!-- ── Description Card ── -->
      <div class="form-card">
        <textarea
          v-model="desc"
          class="post-textarea"
          :placeholder="desc ? '' : '说点什么...'"
          maxlength="500"
          rows="4"
        />
        <div v-if="desc" class="char-count">{{ desc.length }}/500</div>

        <!-- Tags -->
        <div class="tags-area">
          <span v-for="(t, idx) in tags" :key="t" class="tag-chip" @click="removeTag(idx)">
            #{{ t }} <CloseIcon size="10px" />
          </span>
          <input
            v-if="tags.length < 5"
            v-model="tagInput"
            class="tag-input"
            placeholder="添加标签..."
            maxlength="8"
            @keyup.enter="addTag"
          />
        </div>

        <!-- Media upload area -->
        <div v-if="imagePreviews.length || videoPreview" class="media-grid">
          <div v-for="(url, idx) in imagePreviews" :key="'img-'+idx" class="media-thumb" @click="removeImage(idx)">
            <img :src="url" loading="lazy" decoding="async" />
            <div class="media-remove"><CloseIcon size="14px" /></div>
          </div>
          <div v-if="videoPreview" class="media-thumb video" @click="removeVideo">
            <video :src="videoPreview" />
            <div class="media-remove"><CloseIcon size="14px" /></div>
            <div class="media-badge">视频</div>
          </div>
        </div>
      </div>

      <!-- ── Upload buttons ── -->
      <div class="upload-row" v-if="images.length < 9 && !videoPreview">
        <label class="upload-card">
          <ImageIcon size="20px" />
          <span>图片</span>
          <input type="file" accept="image/*" multiple hidden @change="onImagesChange" />
        </label>
        <label v-if="!imagePreviews.length" class="upload-card">
          <VideoIcon size="20px" />
          <span>视频</span>
          <input type="file" accept="video/*" hidden @change="onVideoChange" />
        </label>
      </div>

      <!-- ── Price Card ── -->
      <div class="form-card price-card">
        <div class="price-header">
          <MoneyIcon class="price-icon" />
          <span class="price-label">报酬</span>
        </div>
        <div class="price-row">
          <span class="price-symbol">¥</span>
          <input
            v-model="price"
            class="price-input"
            type="number"
            placeholder="0"
            min="1"
          />
        </div>
        <p v-if="price && price >= 1" class="deposit-note">
          <span class="deposit-dot" />
          需缴纳 ¥{{ deposit }} 押金（{{ depositRate * 100 }}%），完成后退还
        </p>
      </div>

      <!-- ── Settings Card ── -->
      <button class="settings-trigger" @click="showSettings = !showSettings">
        <span>{{ showSettings ? '收起设置' : '发布设置' }}</span>
        <span class="trigger-chevron" :class="{ open: showSettings }"></span>
      </button>

      <Transition name="settings-slide">
        <div v-if="showSettings" class="form-card settings-card">
          <!-- Service type -->
          <div class="set-item">
            <span class="set-label">服务类型</span>
            <div class="pill-row">
              <button class="pill-btn" :class="{ on: serviceType === 'ONLINE' }" @click="serviceType = 'ONLINE'">线上</button>
              <button class="pill-btn" :class="{ on: serviceType === 'OFFLINE' }" @click="serviceType = 'OFFLINE'">线下</button>
            </div>
          </div>

          <!-- City -->
          <div class="set-item">
            <span class="set-label">所在城市</span>
            <div class="city-row">
              <select v-model="province" class="city-sel" @change="city = ''; district = ''">
                <option value="">省</option>
                <option v-for="p in provinceData" :key="p.code" :value="p.code">{{ p.name }}</option>
              </select>
              <select v-model="city" class="city-sel" :disabled="!province" @change="district = ''">
                <option value="">市</option>
                <option v-for="c in selCities" :key="c.code" :value="c.code">{{ c.name }}</option>
              </select>
              <select v-model="district" class="city-sel" :disabled="!city">
                <option value="">区</option>
                <option v-for="d in selDistricts" :key="d.code" :value="d.code">{{ d.name }}</option>
              </select>
            </div>
          </div>

          <!-- Expire -->
          <div class="set-item">
            <span class="set-label">有效期</span>
            <div class="pill-row">
              <button v-for="d in [1,3,7]" :key="d" class="pill-btn sm" :class="{ on: expireDays === d }" @click="expireDays = d">{{ d }}天</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Publish Bar ── -->
    <div class="publish-bar">
      <div class="publish-bg" />
      <button class="publish-btn" :class="{ ready: canSubmit }" :disabled="!canSubmit" @click="submit">
        <span v-if="submitting" class="btn-loading" />
        <span v-else>{{ canSubmit ? '发布需求' : '请填写完整信息' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Base ── */
.create-page {
  height: 100%; display: flex; flex-direction: column;
  background: var(--bg-primary); position: relative;
}
.page-glow {
  position: fixed; top: 0; left: 0; right: 0; height: 320px; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse at 50% 0%, var(--bg-secondary) 0%, transparent 60%);
}
.form-scroll {
  flex: 1; overflow-y: auto; padding: 20px 20px 120px; position: relative; z-index: 1;
}

/* ── Hero ── */
.create-hero { text-align: center; padding: 16px 0 28px; }
.hero-icon-wrap {
  width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 16px;
  background: var(--primary-gradient); display: flex; align-items: center; justify-content: center;
  box-shadow: var(--glow-primary);
}
.hero-icon { font-size: 26px; color: #fff; }
.hero-title { font-size: 26px; font-weight: 900; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.3px; }
.hero-sub { font-size: 14px; color: var(--text-muted); margin: 0; }

/* ── Steps ── */
.step-row { display: flex; align-items: center; justify-content: center; gap: 0; margin-top: 18px; }
.step-dot {
  width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: var(--text-muted);
  background: var(--bg-card); border: 2px solid var(--border-color);
  transition: all 0.3s ease;
}
.step-dot.done { background: var(--primary-gradient); border-color: transparent; color: #fff; }
.step-dot.active { box-shadow: var(--glow-primary); transform: scale(1.15); }
.step-line { width: 32px; height: 2px; background: var(--border-color); transition: background 0.3s ease; }
.step-line.done { background: var(--primary-start); }
.step-hint { font-size: 12px; color: var(--text-muted); margin-top: 8px; }

/* ── Banners ── */
.limit-banner {
  padding: 10px 16px; border-radius: 10px; margin-bottom: 12px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  color: var(--error-color); font-size: 13px; text-align: center; font-weight: 600;
}
.demand-frozen-banner {
  padding: 12px 16px; margin-bottom: 12px; border-radius: 10px;
  background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);
  color: var(--error-color); font-size: 13px; line-height: 1.5; text-align: center;
}

/* ── Form Card ── */
.form-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 16px; padding: 20px; margin-bottom: 12px;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.25s ease;
}
.form-card:focus-within { border-color: color-mix(in srgb, var(--accent-color) 50%, transparent); }

.post-textarea {
  width: 100%; min-height: 110px; border: none; outline: none; resize: none;
  background: transparent; color: var(--text-primary);
  font-size: 16px; line-height: 1.7; font-family: var(--font-family);
}
.post-textarea::placeholder { color: var(--text-muted); font-size: 15px; }

.char-count { text-align: right; font-size: 12px; color: var(--text-muted); margin-top: -4px; }

/* ── Tags ── */
.tags-area { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-color); }
.tag-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 5px 12px; border-radius: 20px;
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  color: var(--accent-color); font-size: 13px; font-weight: 600; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--accent-color) 18%, transparent);
  transition: all 0.15s;
}
.tag-chip:hover { background: color-mix(in srgb, var(--accent-color) 22%, transparent); }
.tag-input {
  width: 100px; padding: 5px 12px; border: 1px dashed var(--border-color);
  border-radius: 20px; background: transparent;
  color: var(--text-primary); font-size: 13px; outline: none; font-family: var(--font-family);
}
.tag-input:focus { border-color: var(--accent-color); border-style: solid; }

/* ── Media ── */
.media-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-color); }
.media-thumb {
  width: 80px; height: 80px; border-radius: 10px; overflow: hidden;
  position: relative; cursor: pointer; background: var(--bg-tertiary);
}
.media-thumb img, .media-thumb video { width: 100%; height: 100%; object-fit: cover; }
.media-remove {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55); color: #fff; opacity: 0; transition: opacity 0.2s;
}
.media-thumb:hover .media-remove { opacity: 1; }
.media-badge {
  position: absolute; right: 4px; bottom: 4px; padding: 2px 6px; border-radius: 4px;
  background: rgba(0,0,0,0.6); color: #fff; font-size: 10px; font-weight: 600;
}

.upload-row { display: flex; gap: 10px; margin-bottom: 12px; }
.upload-card {
  flex: 1; height: 64px; border-radius: 12px;
  border: 1.5px dashed var(--border-color);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; cursor: pointer; color: var(--text-muted); font-size: 12px;
  transition: all 0.2s; background: var(--bg-card);
}
.upload-card:hover { border-color: var(--accent-color); color: var(--accent-color); background: var(--bg-tertiary); }

/* ── Price ── */
.price-card { display: flex; flex-direction: column; }
.price-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.price-icon { font-size: 20px; color: var(--accent-color); }
.price-label { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.price-row { display: flex; align-items: center; gap: 6px; }
.price-symbol { font-size: 32px; font-weight: 900; color: var(--accent-color); line-height: 1; }
.price-input {
  flex: 1; padding: 12px 16px; border: 1px solid var(--border-color);
  border-radius: 12px; background: var(--bg-secondary);
  color: var(--text-primary); font-size: 32px; font-weight: 800; outline: none;
  font-family: var(--font-mono); letter-spacing: -1px;
}
.price-input:focus { border-color: var(--accent-color); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 10%, transparent); }
.price-input::placeholder { font-weight: 400; color: var(--text-muted); font-size: 24px; }
.deposit-note {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);
  font-size: 12px; color: var(--text-muted);
}
.deposit-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--warning-color); flex-shrink: 0; }

/* ── Settings ── */
.settings-trigger {
  width: 100%; padding: 14px; border: 1px dashed var(--border-color); border-radius: 12px;
  background: transparent; color: var(--text-muted); font-size: 13px;
  cursor: pointer; font-family: var(--font-family);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s; margin-bottom: 12px;
}
.settings-trigger:hover { border-color: var(--accent-color); color: var(--accent-color); }
.trigger-chevron { transition: transform 0.25s ease; }
.trigger-chevron::after {
  content: ''; display: block; width: 6px; height: 6px;
  border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
}
.trigger-chevron.open::after { transform: rotate(-135deg); }

.settings-card { margin-top: 0; }
.set-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 0;
}
.set-item + .set-item { border-top: 1px solid var(--border-color); }
.set-label { font-size: 14px; color: var(--text-primary); font-weight: 500; }

/* Pill buttons */
.pill-row { display: flex; gap: 0; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); }
.pill-btn {
  padding: 7px 20px; border: none; background: transparent;
  color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer;
  font-family: var(--font-family); transition: all 0.2s;
}
.pill-btn + .pill-btn { border-left: 1px solid var(--border-color); }
.pill-btn.on { background: var(--accent-color); color: #fff; font-weight: 700; }
.pill-btn.sm { padding: 5px 14px; font-size: 12px; }

/* City selects */
.city-row { display: flex; gap: 6px; }
.city-sel {
  padding: 7px 10px; border: 1px solid var(--border-color);
  border-radius: 8px; background: var(--bg-secondary);
  color: var(--text-primary); font-size: 13px; outline: none;
  font-family: var(--font-family); max-width: 100px;
  transition: border-color 0.15s;
}
.city-sel:focus { border-color: var(--accent-color); }
.city-sel:disabled { opacity: 0.35; }

/* Settings slide transition */
.settings-slide-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.settings-slide-leave-active { transition: all 0.2s ease; }
.settings-slide-enter-from { opacity: 0; transform: translateY(-8px); max-height: 0; }
.settings-slide-enter-to { opacity: 1; transform: translateY(0); max-height: 300px; }
.settings-slide-leave-from { opacity: 1; transform: translateY(0); max-height: 300px; }
.settings-slide-leave-to { opacity: 0; transform: translateY(-8px); max-height: 0; }
.settings-card { overflow: hidden; }

/* ── Publish Bar ── */
.publish-bar {
  position: fixed; bottom: 0; left: var(--sidebar-w); right: 0;
  padding: 16px 20px 28px; z-index: 10;
}
.publish-bg {
  position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(to top, var(--bg-primary) 40%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.publish-btn {
  width: 100%; max-width: 560px; margin: 0 auto; display: flex; align-items: center; justify-content: center;
  padding: 15px; border: none; border-radius: 14px;
  background: var(--bg-tertiary); color: var(--text-muted);
  font-size: 16px; font-weight: 700; cursor: pointer;
  letter-spacing: 2px; font-family: var(--font-family);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.publish-btn:disabled { cursor: not-allowed; }
.publish-btn.ready {
  background: var(--primary-gradient); color: #fff;
  box-shadow: var(--glow-primary);
}
.publish-btn.ready:hover { transform: translateY(-1px); box-shadow: 0 0 36px rgba(102,126,234,0.4); }
.publish-btn.ready:active { transform: translateY(0) scale(0.98); }

.btn-loading {
  width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: btn-spin 0.6s linear infinite;
}
@keyframes btn-spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .publish-bar { left: 0; bottom: calc(64px + env(safe-area-inset-bottom, 0px)); }
  .form-scroll { padding: 16px 16px 140px; }
  .create-hero { padding: 8px 0 20px; }
  .hero-title { font-size: 22px; }
}
</style>
