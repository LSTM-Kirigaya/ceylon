"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIREMENT_STATUS = exports.REQUIREMENT_TYPES = void 0;
exports.getPriorityLabel = getPriorityLabel;
exports.getPriorityColor = getPriorityColor;
exports.REQUIREMENT_TYPES = [
    { value: 'Bug', label: '缺陷报告', color: '#ef4444' },
    { value: 'Feature', label: '功能需求', color: '#22c55e' },
    { value: 'Improvement', label: '功能改进', color: '#3b82f6' },
    { value: 'Documentation', label: '文档缺失', color: '#a855f7' },
    { value: 'Security', label: '安全问题', color: '#dc2626' },
    { value: 'Discussion', label: '讨论和咨询', color: '#f59e0b' },
];
exports.REQUIREMENT_STATUS = [
    { value: 'pending', label: '待启动', color: '#6b7280' },
    { value: 'in_progress', label: '开发中', color: '#3b82f6' },
    { value: 'completed', label: '已完成', color: '#22c55e' },
    { value: 'rejected', label: '已拒绝', color: '#ef4444' },
];
function getPriorityLabel(priority) {
    return `P${priority}`;
}
function getPriorityColor(priority) {
    if (priority <= 2)
        return '#dc2626';
    if (priority <= 4)
        return '#ea580c';
    if (priority <= 6)
        return '#f59e0b';
    if (priority <= 8)
        return '#3b82f6';
    return '#6b7280';
}
//# sourceMappingURL=constants.js.map