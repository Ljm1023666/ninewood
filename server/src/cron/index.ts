import { startFreezeDemandsCron } from './freeze-demands.js';
import { startSnatchResetCron } from './snatch-reset.js';
import { startCircleActivityCron } from './circle-activity.js';

export function startAllCronJobs() {
  startFreezeDemandsCron();
  startSnatchResetCron();
  startCircleActivityCron();
  console.log('[Cron] All cron jobs started');
}
