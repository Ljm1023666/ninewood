export function formatRelativeTime(ts) {
    if (!ts)
        return '';
    const d = new Date(ts);
    if (isNaN(d.getTime()))
        return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000)
        return '刚刚';
    if (diff < 3600000)
        return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000)
        return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 259200000)
        return `${Math.floor(diff / 86400000)}天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
}
export function formatChatTime(ts) {
    if (!ts)
        return '';
    const d = new Date(ts);
    if (isNaN(d.getTime()))
        return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (msgDay.getTime() === today.getTime()) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (msgDay.getTime() === yesterday.getTime())
        return '昨天';
    const diff = now.getTime() - d.getTime();
    if (diff < 604800000) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[d.getDay()];
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
}
export function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}
//# sourceMappingURL=time.js.map