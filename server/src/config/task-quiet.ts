/**
 * TASK_QUIET_ENABLED Feature Flag（Phase 2）
 * 默认 0；本机验收可设 1。
 * 退出条件：Q1–Q9 通过后可默认开启。
 */
export function isTaskQuietEnabled(): boolean {
  return process.env.TASK_QUIET_ENABLED === '1'
}
