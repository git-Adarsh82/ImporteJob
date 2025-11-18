import { io, Socket } from 'socket.io-client';
import { SocketImportEvent } from '@/types';

class SocketClient {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    connect() {
        if (this.socket?.connected) {
            return this.socket;
        }

        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.setupEventHandlers();
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    private setupEventHandlers() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
            this.emit('socket:connected', { socketId: this.socket?.id });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.emit('socket:disconnected', { reason });
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.emit('socket:error', { error });
        });

        // Import events
        this.socket.on('import:queued', (data: SocketImportEvent) => {
            this.emit('import:queued', data);
        });

        this.socket.on('import:progress', (data: SocketImportEvent) => {
            this.emit('import:progress', data);
        });

        this.socket.on('import:complete', (data: SocketImportEvent) => {
            this.emit('import:complete', data);
        });

        this.socket.on('import:failed', (data: SocketImportEvent) => {
            this.emit('import:failed', data);
        });

        this.socket.on('queue:status', (data: any) => {
            this.emit('queue:status', data);
        });
    }

    subscribeToImports() {
        if (!this.socket) {
            this.connect();
        }
        this.socket?.emit('subscribe:imports');
    }

    subscribeToImport(importId: string) {
        if (!this.socket) {
            this.connect();
        }
        this.socket?.emit('subscribe:import', importId);
    }

    unsubscribeFromImport(importId: string) {
        this.socket?.emit('unsubscribe:import', importId);
    }

    requestQueueStatus(callback: (data: any) => void) {
        this.socket?.emit('queue:status', callback);
    }

    requestImportHistory(options: any, callback: (data: any) => void) {
        this.socket?.emit('imports:history', options, callback);
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
    }

    off(event: string, callback: Function) {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: any) {
        this.listeners.get(event)?.forEach(callback => callback(data));
    }

    isConnected() {
        return this.socket?.connected || false;
    }
}

export const socketClient = new SocketClient();
