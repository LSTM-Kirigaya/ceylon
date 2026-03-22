"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProjects = listProjects;
exports.selectProject = selectProject;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../utils/api");
const config_1 = require("../utils/config");
async function listProjects() {
    const api = await (0, api_1.createApiClient)();
    console.log(chalk_1.default.gray('Fetching projects...\n'));
    const response = await api.post('/cli/projects');
    const projects = response.data.projects;
    if (projects.length === 0) {
        console.log(chalk_1.default.yellow('No projects found.'));
        console.log(chalk_1.default.gray('Create a project at http://localhost:3000/dashboard'));
        return;
    }
    console.log(chalk_1.default.blue('Your Projects:\n'));
    projects.forEach((project, index) => {
        const isLast = index === projects.length - 1;
        const prefix = isLast ? '└──' : '├──';
        console.log(`${prefix} ${chalk_1.default.white.bold(project.name)}`);
        console.log(`    ${chalk_1.default.gray('ID:')} ${project.id}`);
        if (project.description) {
            console.log(`    ${chalk_1.default.gray('Desc:')} ${project.description}`);
        }
        console.log(`    ${chalk_1.default.gray('Created:')} ${new Date(project.created_at).toLocaleDateString()}`);
        if (!isLast) {
            console.log();
        }
    });
    console.log(chalk_1.default.gray(`\nTotal: ${projects.length} project(s)`));
}
async function selectProject() {
    const api = await (0, api_1.createApiClient)();
    const response = await api.post('/cli/projects');
    const projects = response.data.projects;
    if (projects.length === 0) {
        throw new Error('No projects found. Please create a project first.');
    }
    const choices = projects.map(p => ({
        name: `${p.name} ${chalk_1.default.gray(`(${p.id})`)}`,
        value: p.id,
    }));
    const { projectId } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'projectId',
            message: 'Select a project:',
            choices,
        },
    ]);
    await (0, config_1.saveConfig)({ lastProjectId: projectId });
    return projectId;
}
//# sourceMappingURL=projects.js.map