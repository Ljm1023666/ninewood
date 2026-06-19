export interface User {
    id: string;
    phone: string;
    nickname: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    cityCode: string | null;
    certificationLevel: string;
    snatchCredits: number;
    creditScore: number;
    completedOrders?: number;
    createdAt?: string;
}
export declare const useUserStore: any;
//# sourceMappingURL=user.d.ts.map