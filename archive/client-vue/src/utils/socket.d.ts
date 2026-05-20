import { Socket } from 'socket.io-client';
export declare function connectSocket(token: string): Socket;
export declare function getSocket(): Socket | null;
export declare function disconnectSocket(): void;
export declare function joinCircleRoom(circleId: string): void;
export declare function leaveCircleRoom(circleId: string): void;
export declare function joinDemandRoom(demandId: string): void;
export declare function sendPrivateMessage(receiverId: string, content: string): void;
//# sourceMappingURL=socket.d.ts.map