"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.logout = logout;
exports.getTokenStatus = getTokenStatus;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../utils/config");
const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTU0MDMsImV4cCI6MjA4OTc3MTQwM30.8fmv1ppusEdHEDvEnHGzKgf9g_zsTToyx832BL3yopo';
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
async function login() {
    console.log(chalk_1.default.blue('🔐 Ceylon Login\n'));
    console.log(chalk_1.default.gray('Please enter your credentials:\n'));
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: (input) => {
                if (!input)
                    return 'Email is required';
                if (!input.includes('@'))
                    return 'Please enter a valid email';
                return true;
            },
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password:',
            validate: (input) => {
                if (!input)
                    return 'Password is required';
                if (input.length < 8)
                    return 'Password must be at least 8 characters';
                return true;
            },
        },
    ]);
    console.log(chalk_1.default.gray('\nAuthenticating...'));
    const { data, error } = await supabase.auth.signInWithPassword({
        email: answers.email,
        password: answers.password,
    });
    if (error) {
        throw new Error(error.message);
    }
    if (!data.session) {
        throw new Error('Login failed. Please check your credentials.');
    }
    // Save the access token
    await (0, config_1.saveToken)(data.session.access_token);
    console.log(chalk_1.default.green('\n✓ Login successful!'));
    console.log(chalk_1.default.gray('Welcome,'), chalk_1.default.white(data.user.email));
}
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.warn(chalk_1.default.yellow('Warning:'), error.message);
    }
    await (0, config_1.removeToken)();
}
async function getTokenStatus() {
    const token = await (0, config_1.getToken)();
    if (!token) {
        return { authenticated: false };
    }
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return { authenticated: false };
        }
        return {
            authenticated: true,
            user: {
                id: user.id,
                email: user.email || '',
                display_name: user.user_metadata?.display_name,
            },
        };
    }
    catch {
        return { authenticated: false };
    }
}
//# sourceMappingURL=auth.js.map