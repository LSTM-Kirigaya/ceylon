"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiClient = createApiClient;
exports.checkAuth = checkAuth;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
async function createApiClient() {
    const token = await (0, config_1.getToken)();
    const config = await (0, config_1.getConfig)();
    if (!token) {
        throw new Error('Not authenticated. Please run `ceylon login` first.');
    }
    const client = axios_1.default.create({
        baseURL: config.apiUrl,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    client.interceptors.response.use((response) => response, (error) => {
        if (error.response?.status === 401) {
            throw new Error('Authentication expired. Please run `ceylon login` again.');
        }
        throw error;
    });
    return client;
}
async function checkAuth() {
    const token = await (0, config_1.getToken)();
    return !!token;
}
//# sourceMappingURL=api.js.map