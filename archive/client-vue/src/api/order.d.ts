export declare const orderApi: {
    create(demandId: string, applicationId: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    list(params?: {
        role?: string;
        page?: number;
    }): Promise<import("axios").AxiosResponse<any, any, {}>>;
    get(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    prepay(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    complete(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    confirm(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    dispute(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    partial(id: string, newPrice: number, description: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
};
//# sourceMappingURL=order.d.ts.map