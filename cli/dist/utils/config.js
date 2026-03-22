"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.ensureConfigDir = ensureConfigDir;
exports.getConfig = getConfig;
exports.saveConfig = saveConfig;
exports.getToken = getToken;
exports.saveToken = saveToken;
exports.removeToken = removeToken;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.ceylon');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'config.json');
const TOKEN_FILE = path_1.default.join(CONFIG_DIR, 'token');
exports.defaultConfig = {
    apiUrl: process.env.CEYLON_API_URL || 'http://localhost:3000/api',
};
async function ensureConfigDir() {
    await fs_extra_1.default.ensureDir(CONFIG_DIR);
}
async function getConfig() {
    try {
        const exists = await fs_extra_1.default.pathExists(CONFIG_FILE);
        if (!exists) {
            return exports.defaultConfig;
        }
        const config = await fs_extra_1.default.readJson(CONFIG_FILE);
        return { ...exports.defaultConfig, ...config };
    }
    catch {
        return exports.defaultConfig;
    }
}
async function saveConfig(config) {
    await ensureConfigDir();
    const current = await getConfig();
    await fs_extra_1.default.writeJson(CONFIG_FILE, { ...current, ...config }, { spaces: 2 });
}
async function getToken() {
    try {
        const exists = await fs_extra_1.default.pathExists(TOKEN_FILE);
        if (!exists)
            return null;
        return fs_extra_1.default.readFile(TOKEN_FILE, 'utf-8');
    }
    catch {
        return null;
    }
}
async function saveToken(token) {
    await ensureConfigDir();
    await fs_extra_1.default.writeFile(TOKEN_FILE, token, { mode: 0o600 });
}
async function removeToken() {
    try {
        await fs_extra_1.default.remove(TOKEN_FILE);
    }
    catch {
        // Ignore errors
    }
}
//# sourceMappingURL=config.js.map