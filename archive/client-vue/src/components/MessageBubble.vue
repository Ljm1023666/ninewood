<script setup lang="ts">
defineProps<{
  content: string;
  isMine: boolean;
  type?: string;
  avatarUrl?: string;
  nickname?: string;
  hideAvatar?: boolean;
}>();

function isImageUrl(s: string) {
  return /^\/uploads\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(s);
}
function isVideoUrl(s: string) {
  return /^\/uploads\/.*\.(mp4|mov|webm|mkv)$/i.test(s);
}
</script>

<template>
  <div class="msg-row" :class="{ mine: isMine }">
    <!-- Avatar for peer messages -->
    <div v-if="!isMine && type !== 'SYSTEM' && !hideAvatar" class="avatar-wrap">
      <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" loading="lazy" decoding="async" />
      <span v-else class="avatar-text">{{ nickname?.charAt(0) || '?' }}</span>
    </div>

    <div class="bubble" :class="{ mine: isMine, system: type === 'SYSTEM' }">
      <template v-if="type === 'SYSTEM'">
        <span class="system-text">{{ content }}</span>
      </template>
      <template v-else-if="isVideoUrl(content)">
        <video :src="content" class="msg-video" controls preload="metadata" />
      </template>
      <template v-else-if="isImageUrl(content)">
        <img :src="content" class="msg-img" loading="lazy" />
      </template>
      <template v-else>
        <span class="msg-text">{{ content }}</span>
      </template>
      <div v-if="type !== 'SYSTEM'" class="tail" :class="{ mine: isMine }" />
    </div>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 4px 14px;
}
.msg-row.mine { flex-direction: row-reverse; }

.avatar-wrap {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  overflow: hidden; margin-bottom: 2px;
  background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-card));
  display: flex; align-items: center; justify-content: center;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-text { font-size: 14px; font-weight: 700; color: var(--text-secondary); }

.bubble {
  position: relative;
  max-width: 65%; padding: 10px 13px;
  font-size: 15px; line-height: 1.5; word-break: break-word;
  background: var(--bg-tertiary); color: var(--text-primary);
  border-radius: 4px 14px 14px 14px;
}
.bubble.mine {
  background: var(--success-color); color: #000;
  border-radius: 14px 4px 14px 14px;
}
.bubble.system {
  max-width: 80%; margin: 0 auto; padding: 6px 12px;
  background: var(--bg-secondary); color: var(--text-muted);
  border-radius: 4px; font-size: 12px; text-align: center;
}

.tail {
  position: absolute; bottom: 0;
  width: 0; height: 0;
  border-bottom: 8px solid var(--bg-tertiary);
}
.tail:not(.mine) {
  left: -6px;
  border-left: 8px solid transparent;
}
.tail.mine {
  right: -6px;
  border-right: 8px solid transparent;
  border-bottom-color: var(--success-color);
}

.msg-text { white-space: pre-wrap; }

.msg-img {
  max-width: 200px; max-height: 260px; border-radius: 6px;
  display: block; cursor: pointer; object-fit: cover;
}
.msg-video {
  max-width: 240px; max-height: 320px; border-radius: 6px;
  display: block; background: #000;
}
</style>
