export interface Config {
    apiUrl: string;
    lastProjectId?: string;
    lastViewId?: string;
}
export declare const defaultConfig: Config;
export declare function ensureConfigDir(): Promise<void>;
export declare function getConfig(): Promise<Config>;
export declare function saveConfig(config: Partial<Config>): Promise<void>;
export declare function getToken(): Promise<string | null>;
export declare function saveToken(token: string): Promise<void>;
export declare function removeToken(): Promise<void>;
//# sourceMappingURL=config.d.ts.map