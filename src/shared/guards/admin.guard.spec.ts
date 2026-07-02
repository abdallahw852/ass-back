import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  it('throws when the request is unauthenticated', () => {
    expect(() => guard.canActivate(createContext({ session: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws when the authenticated user is not an admin', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          session: { user: { id: 1, role: 'supplier' } },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows admin users', () => {
    expect(
      guard.canActivate(
        createContext({
          session: { user: { id: 1, role: 'admin' } },
        }),
      ),
    ).toBe(true);
  });
});
