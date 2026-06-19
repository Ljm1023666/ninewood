export declare const demandApi: {
    list(params?: Record<string, any>): Promise<import("axios").AxiosResponse<any, any, {}>>;
    get(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    create(formData: FormData): Promise<import("axios").AxiosResponse<any, any, {}>>;
    apply(id: string, data: {
        offerPrice?: number;
        message?: string;
    }): Promise<import("axios").AxiosResponse<any, any, {}>>;
    snatch(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    acceptSnatch(id: string, applicationId: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    myDemands(page?: number): Promise<import("axios").AxiosResponse<any, any, {}>>;
    myApplications(page?: number): Promise<import("axios").AxiosResponse<any, any, {}>>;
    getApplications(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    deleteDemand(id: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    getMyStatus(): Promise<import("axios").AxiosResponse<any, any, {}>>;
};
//# sourceMappingURL=demand.d.ts.map