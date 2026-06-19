export declare const userApi: {
    getMe(): Promise<import("axios").AxiosResponse<any, any, {}>>;
    get(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    updateProfile(data: FormData | Record<string, any>): Promise<import("axios").AxiosResponse<any, any, {}>>;
    certStatus(): Promise<import("axios").AxiosResponse<any, any, {}>>;
    upgradeCert(): Promise<import("axios").AxiosResponse<any, any, {}>>;
    snatchStatus(): Promise<import("axios").AxiosResponse<any, any, {}>>;
    search(keyword: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    follow(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    unfollow(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    followers(id: string, page?: number): Promise<import("axios").AxiosResponse<any, any, {}>>;
    following(id: string, page?: number): Promise<import("axios").AxiosResponse<any, any, {}>>;
};
//# sourceMappingURL=user.d.ts.map