import { io, type Socket } from 'socket.io-client';
import { devPassword } from '@helpers/socketHelpers';

const URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
    (import.meta.env.DEV ? 'http://localhost:8181' : 'http://localhost:8181');

let socket: Socket | undefined;

const waitForServer = async (baseUrl: string, retries = 10, delay = 500) => {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) {
                return;
            }
        } catch {
            // Ignore and retry until the server becomes available.
        }

        if (attempt === retries) {
            throw new Error(`Socket server did not become ready at ${baseUrl}`);
        }

        await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
};

const socketConnection = async (devUserName: string) => {
    if (socket?.connected) {
        return socket;
    }

    await waitForServer(URL);

    socket = io(URL, {
        auth: {
            userName: devUserName,
            password: devPassword
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('socket connected', socket?.id, URL);
        if (typeof window !== 'undefined') {
            const w = window as Window & { __socketConnectState?: unknown };
            w.__socketConnectState = { connected: true, id: socket?.id, url: URL };
        }
    });

    socket.on('connect_error', (error) => {
        console.error('socket connect error', error);
        if (typeof window !== 'undefined') {
            const w = window as Window & { __socketConnectState?: unknown };
            w.__socketConnectState = { connected: false, error: error?.message ?? String(error), url: URL };
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('socket disconnected', reason);
        if (typeof window !== 'undefined') {
            const w = window as Window & { __socketConnectState?: unknown };
            w.__socketConnectState = { connected: false, reason, url: URL };
        }
    });

    return socket;
};

export default socketConnection;