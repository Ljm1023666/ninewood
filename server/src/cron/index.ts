import { startFreezeDemandsCron } from './freeze-demands.js';
import { startSnatchResetCron } from './snatch-reset.js';
import { startCircleActivityCron } from './circle-activity.js';
import { startCleanupMessagesCron } from './cleanup-messages.js';
import { runCompressionScheduler } from './compression-scheduler.js';
import { startDemandWindowCron } from './demand-window.js';
import { runLifecycleCron } from '../services/card-lifecycle.js';

export function startAllCronJobs() {
  startFreezeDemandsCron();
  startSnatchResetCron();
  startCircleActivityCron();
  startCleanupMessagesCron();
  startDemandWindowCron(); // AI 2.5: 30s 扫描紧急窗口 + 沟通超时
  // AI 2.8: 卡池生命周期 — 每 6 小时
  setInterval(() => {
    runLifecycleCron().catch(err => console.error('[Cron] Lifecycle failed:', err));
  }, 6 * 60 * 60 * 1000);
  // 压缩调度：每 6 小时运行一次
  setInterval(() => {
    runCompressionScheduler().catch(err => console.error('[Cron] Compression scheduler failed:', err));
  }, 6 * 60 * 60 * 1000);
  console.log('[Cron] All cron jobs started');
}
