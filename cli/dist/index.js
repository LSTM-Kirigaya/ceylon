#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const auth_1 = require("./commands/auth");
const projects_1 = require("./commands/projects");
const views_1 = require("./commands/views");
const requirements_1 = require("./commands/requirements");
const config_1 = require("./utils/config");
const program = new commander_1.Command();
program
    .name('ceylon')
    .description('CLI tool for Ceylon - Intelligent Requirements Management')
    .version('1.0.0');
// Auth commands
program
    .command('login')
    .description('Login to Ceylon')
    .action(async () => {
    try {
        await (0, config_1.ensureConfigDir)();
        await (0, auth_1.login)();
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
program
    .command('logout')
    .description('Logout from Ceylon')
    .action(async () => {
    try {
        await (0, auth_1.logout)();
        console.log(chalk_1.default.green('✓ Logged out successfully'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
program
    .command('status')
    .description('Check authentication status')
    .action(async () => {
    try {
        const status = await (0, auth_1.getTokenStatus)();
        if (status.authenticated) {
            console.log(chalk_1.default.green('✓ Authenticated'));
            console.log(chalk_1.default.gray('User:'), status.user?.email);
        }
        else {
            console.log(chalk_1.default.yellow('✗ Not authenticated'));
            console.log(chalk_1.default.gray('Run `ceylon login` to authenticate'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
// Project commands
program
    .command('projects')
    .description('List all projects')
    .action(async () => {
    try {
        await (0, projects_1.listProjects)();
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
// View commands
program
    .command('views')
    .description('List version views for selected project')
    .option('-p, --project <id>', 'Project ID')
    .action(async (options) => {
    try {
        let projectId = options.project;
        if (!projectId) {
            projectId = await (0, projects_1.selectProject)();
        }
        await (0, views_1.listViews)(projectId);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
// Requirement commands
program
    .command('requirements')
    .alias('reqs')
    .description('List requirements')
    .option('-p, --project <id>', 'Project ID')
    .option('-v, --view <id>', 'Version View ID')
    .action(async (options) => {
    try {
        let projectId = options.project;
        let viewId = options.view;
        if (!projectId) {
            projectId = await (0, projects_1.selectProject)();
        }
        if (!viewId) {
            viewId = await (0, views_1.selectView)(projectId);
        }
        await (0, requirements_1.listRequirements)(viewId);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
program
    .command('create')
    .description('Create a new requirement')
    .option('-p, --project <id>', 'Project ID')
    .option('-v, --view <id>', 'Version View ID')
    .option('-t, --title <title>', 'Requirement title')
    .option('-d, --description <desc>', 'Requirement description')
    .option('--priority <priority>', 'Priority (0-10)', '5')
    .option('--type <type>', 'Type (Bug|Feature|Improvement|Documentation|Security|Discussion)', 'Feature')
    .action(async (options) => {
    try {
        let projectId = options.project;
        let viewId = options.view;
        if (!projectId) {
            projectId = await (0, projects_1.selectProject)();
        }
        if (!viewId) {
            viewId = await (0, views_1.selectView)(projectId);
        }
        await (0, requirements_1.createRequirement)(viewId, {
            title: options.title,
            description: options.description,
            priority: parseInt(options.priority),
            type: options.type,
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
program
    .command('update')
    .description('Update a requirement')
    .argument('<id>', 'Requirement ID')
    .option('-t, --title <title>', 'Requirement title')
    .option('-d, --description <desc>', 'Requirement description')
    .option('--priority <priority>', 'Priority (0-10)')
    .option('--type <type>', 'Type (Bug|Feature|Improvement|Documentation|Security|Discussion)')
    .option('--status <status>', 'Status (pending|in_progress|completed|rejected)')
    .action(async (id, options) => {
    try {
        await (0, requirements_1.updateRequirement)(id, {
            title: options.title,
            description: options.description,
            priority: options.priority ? parseInt(options.priority) : undefined,
            type: options.type,
            status: options.status,
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
program
    .command('delete')
    .description('Delete a requirement')
    .argument('<id>', 'Requirement ID')
    .action(async (id) => {
    try {
        await (0, requirements_1.deleteRequirement)(id);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=index.js.map