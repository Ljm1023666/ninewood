export declare const authApi: {
    sendCode(phone: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    register(phone: string, code: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    login(phone: string, password: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    getMe(): Promise<import("axios").AxiosResponse<any, any, {}>>;
};
//# sourceMappingURL=auth.d.ts.map