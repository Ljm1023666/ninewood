<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { demandApi } from '@/api/demand';
import { MessagePlugin } from 'tdesign-vue-next';
import divisionTree from 'china-division/dist/pca-code.json';

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
  } catch { /* ignore */ }
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

function getCityCode() {
  return district.value || city.value || province.value;
}

// Tags: auto-extracted or manually added
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

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const fd = new FormData();
    // Use description as title (truncated)
    fd.append('title', desc.value.trim().slice(0, 30));
    fd.append('description', desc.value.trim());
    fd.append('minPrice', String(price.value));
    fd.append('category', tags.value.join(',') || '其他');
    fd.append('serviceType', serviceType.value);
    fd.append('cityCode', city.value || province.value || '');
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
    <div class="form-scroll">
      <!-- Status bar -->
      <div class="status-bar">
        <span class="status-item" :class="{ full: atLimit }">已发布 {{ activeCount }}/{{ MAX_ACTIVE }}</span>
        <span v-if="atLimit" class="status-warn">已达上限</span>
      </div>
      <!-- Frozen warning -->
      <div v-if="hasFrozen" class="frozen-warn">
        <span>⚠️ 您有冻结中的需求，请先在「我的需求」中删除后再发布新需求</span>
      </div>

      <div class="post-card">
        <!-- Main text area -->
        <textarea
          v-model="desc"
          class="post-textarea"
          placeholder="说点什么..."
          maxlength="500"
          rows="4"
        />

        <!-- Tags -->
        <div class="tags-area">
          <span v-for="(t, idx) in tags" :key="t" class="tag" @click="removeTag(idx)">
            #{{ t }} <b>×</b>
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

        <!-- Media -->
        <div class="media-row">
          <div v-for="(url, idx) in imagePreviews" :key="idx" class="media-thumb" @click="removeImage(idx)">
            <img :src="url" /><span class="media-x">×</span>
          </div>
          <label v-if="!videoPreview && images.length < 9" class="upload-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>图片</span>
            <input type="file" accept="image/*" multiple hidden @change="onImagesChange" />
          </label>
          <label v-if="!imagePreviews.length && !videoPreview" class="upload-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            <span>视频</span>
            <input type="file" accept="video/*" hidden @change="onVideoChange" />
          </label>
        </div>

        <!-- Price -->
        <div class="price-row">
          <span class="price-symbol">¥</span>
          <input v-model="price" class="price-input" type="number" placeholder="报酬" min="1" />
        </div>
        <p v-if="price && price >= 1" class="deposit-hint">需缴纳 ¥{{ deposit }} 押金（1%），订单完成后退还，过期没收</p>
      </div>

      <!-- Settings toggle -->
      <button class="settings-toggle" @click="showSettings = !showSettings">
        {{ showSettings ? '收起设置 ▲' : '发布设置 ▼' }}
      </button>

      <div v-if="showSettings" class="settings-card">
        <!-- Service type -->
        <div class="set-item">
          <span class="set-label">服务类型</span>
          <div class="switch-row">
            <button class="sw-btn" :class="{ on: serviceType === 'ONLINE' }" @click="serviceType = 'ONLINE'">线上</button>
            <button class="sw-btn" :class="{ on: serviceType === 'OFFLINE' }" @click="serviceType = 'OFFLINE'">线下</button>
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
          <div class="expire-row">
            <button v-for="d in [1,3,7]" :key="d" class="ex-btn" :class="{ on: expireDays === d }" @click="expireDays = d">{{ d }}天</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit -->
    <div class="submit-bar">
      <button class="publish-btn" :disabled="!canSubmit" @click="submit">
        {{ submitting ? '发布中...' : '发布' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  height: 100%; display: flex; flex-direction: column;
  background: var(--bg-primary);
}
.form-scroll {
  flex: 1; overflow-y: auto; padding: 16px 16px 100px;
}
.form-scroll::-webkit-scrollbar { width: 4px; }
.form-scroll::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }

/* ── Status bar ── */
.status-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 0 4px 12px; font-size: 13px; color: var(--text-muted);
}
.status-item.full { color: var(--error-color); font-weight: 600; }
.status-warn {
  padding: 2px 10px; border-radius: 4px;
  background: rgba(239,68,68,0.12); color: var(--error-color);
  font-size: 11px; font-weight: 600;
}
.frozen-warn {
  padding: 12px 16px; margin-bottom: 12px; border-radius: 10px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  color: var(--error-color); font-size: 13px; line-height: 1.5;
}
.deposit-hint {
  margin: 12px 0 0; font-size: 12px; color: var(--text-muted);
  line-height: 1.5;
}

/* ── Post Card ── */
.post-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 16px; padding: 20px;
}

.post-textarea {
  width: 100%; min-height: 100px; border: none; outline: none; resize: none;
  background: transparent; color: var(--text-primary);
  font-size: 16px; line-height: 1.65; font-family: var(--font-family);
}
.post-textarea::placeholder { color: var(--text-muted); }

/* Tags */
.tags-area { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
.tag {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 4px 10px; border-radius: 6px;
  background: var(--bg-tertiary); color: var(--accent-color);
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.tag b { font-size: 11px; opacity: 0.5; }
.tag-input {
  width: 90px; padding: 4px 8px; border: 1px solid var(--border-color);
  border-radius: 6px; background: transparent;
  color: var(--text-primary); font-size: 13px; outline: none;
  font-family: var(--font-family);
}
.tag-input:focus { border-color: var(--accent-color); }

/* Media */
.media-row {
  display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;
  padding-top: 16px; border-top: 1px solid var(--border-color);
}
.media-thumb {
  width: 72px; height: 72px; border-radius: 8px; overflow: hidden;
  position: relative; cursor: pointer;
}
.media-thumb img,
.media-thumb video {
  width: 100%; height: 100%; object-fit: cover; object-position: top center;
}
.media-x {
  position: absolute; top: 2px; right: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(0,0,0,0.55); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; opacity: 0; transition: opacity 0.15s;
}
.media-thumb:hover .media-x { opacity: 1; }
.upload-btn {
  width: 72px; height: 72px; border-radius: 8px;
  border: 1.5px dashed var(--border-color);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; cursor: pointer; color: var(--text-muted); font-size: 11px;
  transition: border-color 0.15s;
}
.upload-btn:hover { border-color: var(--accent-color); color: var(--accent-color); }

/* Price */
.price-row {
  display: flex; align-items: center; gap: 4px;
  margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);
}
.price-symbol {
  font-size: 20px; font-weight: 700; color: var(--accent-color);
}
.price-input {
  width: 120px; padding: 8px 12px; border: 1px solid var(--border-color);
  border-radius: 8px; background: var(--bg-secondary);
  color: var(--text-primary); font-size: 16px; font-weight: 600; outline: none;
  font-family: var(--font-family);
}
.price-input:focus { border-color: var(--accent-color); }
.price-input::placeholder { font-weight: 400; color: var(--text-muted); }

/* ── Settings ── */
.settings-toggle {
  display: block; width: 100%; padding: 14px; margin-top: 12px;
  border: 1px dashed var(--border-color); border-radius: 12px;
  background: transparent; color: var(--text-muted); font-size: 13px;
  cursor: pointer; font-family: var(--font-family); letter-spacing: 1px;
  transition: all 0.15s;
}
.settings-toggle:hover { border-color: var(--accent-color); color: var(--accent-color); }

.settings-card {
  margin-top: 12px; padding: 20px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 16px;
}
.set-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0;
}
.set-item + .set-item { border-top: 1px solid var(--border-color); }
.set-label { font-size: 14px; color: var(--text-primary); font-weight: 500; }

.switch-row { display: flex; gap: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); }
.sw-btn {
  padding: 7px 20px; border: none; background: transparent;
  color: var(--text-secondary); font-size: 13px; cursor: pointer;
  font-family: var(--font-family); transition: all 0.15s;
}
.sw-btn:first-child { border-right: 1px solid var(--border-color); }
.sw-btn.on { background: var(--accent-color); color: #fff; font-weight: 600; }

/* City */
.city-row { display: flex; gap: 6px; }
.city-sel {
  padding: 7px 10px; border: 1px solid var(--border-color);
  border-radius: 8px; background: var(--bg-secondary);
  color: var(--text-primary); font-size: 13px; outline: none;
  font-family: var(--font-family); max-width: 110px;
}
.city-sel:disabled { opacity: 0.4; }

/* Expire */
.expire-row { display: flex; gap: 6px; }
.ex-btn {
  padding: 7px 16px; border-radius: 8px; border: 1px solid var(--border-color);
  background: transparent; color: var(--text-secondary);
  font-size: 13px; cursor: pointer; font-family: var(--font-family);
  transition: all 0.15s;
}
.ex-btn.on { border-color: var(--accent-color); color: var(--accent-color); background: var(--bg-tertiary); font-weight: 600; }

/* ── Submit ── */
.submit-bar {
  position: fixed; bottom: 0; left: 72px; right: 0;
  padding: 12px 20px 24px;
  background: linear-gradient(to top, var(--bg-primary) 60%, transparent);
  z-index: 10;
}
.publish-btn {
  width: 100%; max-width: 540px; margin: 0 auto; display: block;
  padding: 14px; border: none; border-radius: 14px;
  background: var(--primary-gradient); color: #fff;
  font-size: 16px; font-weight: 700; cursor: pointer;
  letter-spacing: 2px; font-family: var(--font-family);
  transition: opacity 0.2s;
}
.publish-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.publish-btn:not(:disabled):hover { opacity: 0.9; }

@media (max-width: 768px) {
  .submit-bar { left: 0; bottom: 64px; }
}
</style>
