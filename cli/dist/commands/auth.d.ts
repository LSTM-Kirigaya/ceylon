interface UserInfo {
    id: string;
    email: string;
    display_name?: string;
}
export declare function login(): Promise<void>;
export declare function logout(): Promise<void>;
export declare function getTokenStatus(): Promise<{
    authenticated: boolean;
    user?: UserInfo;
}>;
export {};
//# sourceMappingURL=auth.d.ts.map