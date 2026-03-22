"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listViews = listViews;
exports.selectView = selectView;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../utils/api");
const config_1 = require("../utils/config");
async function listViews(projectId) {
    const api = await (0, api_1.createApiClient)();
    console.log(chalk_1.default.gray('Fetching version views...\n'));
    const response = await api.post('/cli/views', { projectId });
    const views = response.data.views;
    if (views.length === 0) {
        console.log(chalk_1.default.yellow('No version views found.'));
        console.log(chalk_1.default.gray('Create a version view in the web interface'));
        return;
    }
    console.log(chalk_1.default.blue('Version Views:\n'));
    views.forEach((view, index) => {
        const isLast = index === views.length - 1;
        const prefix = isLast ? '└──' : '├──';
        console.log(`${prefix} ${chalk_1.default.white.bold(view.name)}`);
        console.log(`    ${chalk_1.default.gray('ID:')} ${view.id}`);
        if (view.description) {
            console.log(`    ${chalk_1.default.gray('Desc:')} ${view.description}`);
        }
        if (!isLast) {
            console.log();
        }
    });
    console.log(chalk_1.default.gray(`\nTotal: ${views.length} view(s)`));
}
async function selectView(projectId) {
    const api = await (0, api_1.createApiClient)();
    const response = await api.post('/cli/views', { projectId });
    const views = response.data.views;
    if (views.length === 0) {
        throw new Error('No version views found. Please create a view first.');
    }
    const choices = views.map(v => ({
        name: `${v.name} ${chalk_1.default.gray(`(${v.id})`)}`,
        value: v.id,
    }));
    const { viewId } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'viewId',
            message: 'Select a version view:',
            choices,
        },
    ]);
    await (0, config_1.saveConfig)({ lastViewId: viewId });
    return viewId;
}
//# sourceMappingURL=views.js.map