export declare const messageApi: {
    conversations(): Promise<import("axios").AxiosResponse<any, any, {}>>;
    list(userId: string, page?: number): Promise<import("axios").AxiosResponse<any, any, {}>>;
    send(toUserId: string, content: string): Promise<import("axios").AxiosResponse<any, any, {}>>;
    sendForm(formData: FormData): Promise<import("axios").AxiosResponse<any, any, {}>>;
    unreadCount(): Promise<import("axios").AxiosResponse<any, any, {}>>;
};
//# sourceMappingURL=message.d.ts.map