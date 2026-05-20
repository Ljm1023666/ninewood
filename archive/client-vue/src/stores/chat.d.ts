export interface ChatMessage {
    id?: string;
    content: string;
    type?: string;
    senderId?: string;
    receiverId?: string;
    fromUserId?: string;
    toUserId?: string;
    fromUser?: {
        id: string;
        nickname: string;
        avatarUrl: string | null;
    };
    toUser?: {
        id: string;
        nickname: string;
        avatarUrl: string | null;
    };
    createdAt: string;
    isRead?: boolean;
}
export declare const useChatStore: any;
//# sourceMappingURL=chat.d.ts.map