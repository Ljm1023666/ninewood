export declare const circleApi: {
    list(): Promise<import("axios").AxiosResponse<any, any, {}>>;
    my(): Promise<import("axios").AxiosResponse<any, any, {}>>;
    get(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    create(data: {
        name: string;
        description?: string;
    }): Promise<import("axios").AxiosResponse<any, any, {}>>;
    joinByCode(code: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    applyPublic(data: {
        name: string;
        description?: string;
        cityCode?: string;
    }): Promise<import("axios").AxiosResponse<any, any, {}>>;
    getDemands(circleId: string, page?: number): Promise<import("axios").AxiosResponse<any, any, {}>>;
    join(circleId: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
};
//# sourceMappingURL=circle.d.ts.map