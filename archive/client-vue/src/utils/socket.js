import { io } from 'socket.io-client';
let socket = null;
let pingInterval = null;
export function connectSocket(token) {
    if (socket?.connected) {
        socket.auth = { ...socket.auth, token };
        return socket;
    }
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
    socket = io('/', {
        auth: { token },
        transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => console.log('[Socket] connected'));
    socket.on('disconnect', () => console.log('[Socket] disconnected'));
    socket.on('connect_error', (err) => console.warn('[Socket] connect error:', err.message));
    if (pingInterval)
        clearInterval(pingInterval);
    pingInterval = setInterval(() => socket?.emit('ping'), 20000);
    return socket;
}
export function getSocket() {
    return socket;
}
export function disconnectSocket() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
}
export function joinCircleRoom(circleId) {
    socket?.emit('circle:join', circleId);
}
export function leaveCircleRoom(circleId) {
    socket?.emit('circle:leave', circleId);
}
export function joinDemandRoom(demandId) {
    socket?.emit('demand:join', demandId);
}
export function sendPrivateMessage(receiverId, content) {
    socket?.emit('private:message', { receiverId, content });
}
//# sourceMappingURL=socket.js.map