export declare function listRequirements(viewId: string): Promise<void>;
export declare function createRequirement(viewId: string, options: {
    title?: string;
    description?: string;
    priority?: number;
    type?: string;
}): Promise<void>;
export declare function updateRequirement(reqId: string, options: {
    title?: string;
    description?: string;
    priority?: number;
    type?: string;
    status?: string;
}): Promise<void>;
export declare function deleteRequirement(reqId: string): Promise<void>;
//# sourceMappingURL=requirements.d.ts.map