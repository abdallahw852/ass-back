import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Signer } from '@fastify/cookie';
import type { Server, ServerOptions, Socket } from 'socket.io';

interface RedisLike {
  get(key: string): Promise<string | null>;
}

function parseCookie(header: string, name: string): string | null {
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    const value = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

interface SessionUser {
  id: number;
  _id: string;
  email: string;
  role: string;
  verifiedAt: Date | null;
}

interface StoredSession {
  user?: SessionUser;
}

export interface SessionIoAdapterOptions {
  sessionSecret: string;
  cookieName: string;
  redis: RedisLike;
}

export class SessionIoAdapter extends IoAdapter {
  private readonly signer: Signer;

  constructor(
    app: INestApplicationContext,
    private readonly options: SessionIoAdapterOptions,
  ) {
    super(app);
    this.signer = new Signer(options.sessionSecret, 'sha256');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        ...(options?.cors ?? {}),
        credentials: true,
      },
    }) as Server;

    const authenticate = this.buildAuthMiddleware();
    server.use((socket, next) => {
      authenticate(socket).then(
        () => next(),
        (err: Error) => next(err),
      );
    });

    // Apply to all namespaces (e.g. /messaging) too.
    server.of(/.*/).use((socket, next) => {
      authenticate(socket).then(
        () => next(),
        (err: Error) => next(err),
      );
    });

    return server;
  }

  private buildAuthMiddleware(): (socket: Socket) => Promise<void> {
    return async (socket: Socket) => {
      const cookieHeader =
        socket.handshake.headers?.cookie ??
        (socket.request as { headers?: { cookie?: string } } | undefined)
          ?.headers?.cookie;
      if (!cookieHeader) {
        throw new Error('unauthorized: missing cookie');
      }

      const signed = parseCookie(cookieHeader, this.options.cookieName);
      if (!signed) {
        throw new Error('unauthorized: missing session cookie');
      }

      const unsigned = this.signer.unsign(signed);
      if (!unsigned.valid || !unsigned.value) {
        throw new Error('unauthorized: invalid signature');
      }

      const raw = await this.options.redis.get(`sess:${unsigned.value}`);
      if (!raw) {
        throw new Error('unauthorized: session not found');
      }

      let session: StoredSession;
      try {
        session = JSON.parse(raw) as StoredSession;
      } catch {
        throw new Error('unauthorized: malformed session');
      }
      if (!session.user?.id) {
        throw new Error('unauthorized: anonymous session');
      }

      (socket.data as { user?: SessionUser }).user = session.user;
    };
  }
}
