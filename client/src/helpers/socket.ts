import { io, type Socket } from 'socket.io-client';

const userName = `Rob-${Math.floor(Math.random() * 100000)}`;
const password = 'x';

const URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
    (import.meta.env.DEV ? 'http://127.0.0.1:8181' : 'http://127.0.0.1:8181');

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

const socketConnection = async () => {
    if (socket?.connected) {
        return socket;
    }

    await waitForServer(URL);

    socket = io(URL, {
        auth: {
            userName,
            password
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    return socket;
};

export default socketConnection;