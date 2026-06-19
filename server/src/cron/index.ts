import { startFreezeDemandsCron } from './freeze-demands.js';
import { startSnatchResetCron } from './snatch-reset.js';
import { startCircleActivityCron } from './circle-activity.js';
import { startCleanupMessagesCron } from './cleanup-messages.js';
import { runCompressionScheduler } from './compression-scheduler.js';

export function startAllCronJobs() {
  startFreezeDemandsCron();
  startSnatchResetCron();
  startCircleActivityCron();
  startCleanupMessagesCron();
  // 压缩调度：每 6 小时运行一次
  setInterval(() => {
    runCompressionScheduler().catch(err => console.error('[Cron] Compression scheduler failed:', err));
  }, 6 * 60 * 60 * 1000);
  console.log('[Cron] All cron jobs started');
}
