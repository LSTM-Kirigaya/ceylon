"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRequirements = listRequirements;
exports.createRequirement = createRequirement;
exports.updateRequirement = updateRequirement;
exports.deleteRequirement = deleteRequirement;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../utils/api");
const constants_1 = require("../utils/constants");
const typeColors = {
    'Bug': '#ef4444',
    'Feature': '#22c55e',
    'Improvement': '#3b82f6',
    'Documentation': '#a855f7',
    'Security': '#dc2626',
    'Discussion': '#f59e0b',
};
const statusColors = {
    'pending': '#6b7280',
    'in_progress': '#3b82f6',
    'completed': '#22c55e',
    'rejected': '#ef4444',
};
const statusLabels = {
    'pending': '待启动',
    'in_progress': '开发中',
    'completed': '已完成',
    'rejected': '已拒绝',
};
const typeLabels = {
    'Bug': '缺陷报告',
    'Feature': '功能需求',
    'Improvement': '功能改进',
    'Documentation': '文档缺失',
    'Security': '安全问题',
    'Discussion': '讨论和咨询',
};
async function listRequirements(viewId) {
    const api = await (0, api_1.createApiClient)();
    console.log(chalk_1.default.gray('Fetching requirements...\n'));
    const response = await api.post('/cli/requirements', { viewId });
    const requirements = response.data.requirements;
    if (requirements.length === 0) {
        console.log(chalk_1.default.yellow('No requirements found.'));
        console.log(chalk_1.default.gray('Use `ceylon create` to add requirements'));
        return;
    }
    console.log(chalk_1.default.blue(`Requirements (${requirements.length}):\n`));
    requirements.forEach((req) => {
        const typeColor = typeColors[req.type] || '#6b7280';
        const statusColor = statusColors[req.status] || '#6b7280';
        const priorityColor = getPriorityColor(req.priority);
        console.log(`${chalk_1.default.gray('#' + req.requirement_number)} ${chalk_1.default.white.bold(req.title)}`);
        console.log(`  ${chalk_1.default.hex(typeColor)('●')} ${typeLabels[req.type] || req.type}`);
        console.log(`  ${chalk_1.default.hex(statusColor)('●')} ${statusLabels[req.status] || req.status}`);
        console.log(`  ${chalk_1.default.hex(priorityColor)('●')} ${(0, constants_1.getPriorityLabel)(req.priority)}`);
        if (req.description) {
            console.log(`  ${chalk_1.default.gray(req.description)}`);
        }
        console.log(`  ${chalk_1.default.gray('ID:')} ${req.id}`);
        console.log();
    });
}
async function createRequirement(viewId, options) {
    const api = await (0, api_1.createApiClient)();
    let { title, description, priority, type } = options;
    // Interactive prompts for missing fields
    if (!title) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'title',
                message: 'Requirement title:',
                validate: (input) => input.length > 0 || 'Title is required',
            },
        ]);
        title = answer.title;
    }
    if (!description) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'description',
                message: 'Description (optional):',
            },
        ]);
        description = answer.description;
    }
    if (priority === undefined) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'priority',
                message: 'Priority:',
                choices: [
                    { name: 'P0 - Critical', value: 0 },
                    { name: 'P1 - High', value: 1 },
                    { name: 'P2 - High', value: 2 },
                    { name: 'P3 - Medium', value: 3 },
                    { name: 'P4 - Medium', value: 4 },
                    { name: 'P5 - Normal', value: 5 },
                    { name: 'P6 - Normal', value: 6 },
                    { name: 'P7 - Low', value: 7 },
                    { name: 'P8 - Low', value: 8 },
                    { name: 'P9 - Lowest', value: 9 },
                    { name: 'P10 - Lowest', value: 10 },
                ],
                default: 5,
            },
        ]);
        priority = answer.priority;
    }
    if (!type) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'type',
                message: 'Type:',
                choices: constants_1.REQUIREMENT_TYPES.map(t => ({
                    name: t.label,
                    value: t.value,
                })),
                default: 'Feature',
            },
        ]);
        type = answer.type;
    }
    console.log(chalk_1.default.gray('\nCreating requirement...'));
    const response = await api.post('/cli/requirements/create', {
        viewId,
        title,
        description: description || null,
        priority,
        type,
    });
    const req = response.data.requirement;
    console.log(chalk_1.default.green('\n✓ Requirement created successfully!'));
    console.log(chalk_1.default.gray('ID:'), req.id);
    console.log(chalk_1.default.gray('Number:'), `#${req.requirement_number}`);
    console.log(chalk_1.default.gray('Title:'), req.title);
}
async function updateRequirement(reqId, options) {
    const api = await (0, api_1.createApiClient)();
    const updates = {};
    if (options.title !== undefined)
        updates.title = options.title;
    if (options.description !== undefined)
        updates.description = options.description;
    if (options.priority !== undefined)
        updates.priority = options.priority;
    if (options.type !== undefined)
        updates.type = options.type;
    if (options.status !== undefined)
        updates.status = options.status;
    if (Object.keys(updates).length === 0) {
        console.log(chalk_1.default.yellow('No fields to update.'));
        return;
    }
    console.log(chalk_1.default.gray('Updating requirement...'));
    await api.post('/cli/requirements/update', {
        reqId,
        updates,
    });
    console.log(chalk_1.default.green('\n✓ Requirement updated successfully!'));
}
async function deleteRequirement(reqId) {
    const api = await (0, api_1.createApiClient)();
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete requirement ${reqId}?`,
            default: false,
        },
    ]);
    if (!confirm) {
        console.log(chalk_1.default.gray('Cancelled.'));
        return;
    }
    console.log(chalk_1.default.gray('Deleting requirement...'));
    await api.post('/cli/requirements/delete', { reqId });
    console.log(chalk_1.default.green('\n✓ Requirement deleted successfully!'));
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
//# sourceMappingURL=requirements.js.map