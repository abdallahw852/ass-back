import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VerifiedUserGuard } from './verified-user.guard';
import { ALLOW_UNVERIFIED_KEY } from '../../decorators/allow-unverified.decorator';

function makeContext(
  sessionUser: unknown,
  handler?: unknown,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ session: { user: sessionUser } }),
    }),
    getHandler: () => handler ?? (() => {}),
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('VerifiedUserGuard', () => {
  let reflector: Reflector;
  let guard: VerifiedUserGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new VerifiedUserGuard(reflector);
  });

  it('allows a verified session through', () => {
    const ctx = makeContext({ id: 1, _id: 'uuid', verifiedAt: new Date() });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException for an unverified session (verifiedAt null)', () => {
    const ctx = makeContext({ id: 1, _id: 'uuid', verifiedAt: null });
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('throws ForbiddenException for an unverified session (verifiedAt undefined)', () => {
    const ctx = makeContext({ id: 1, _id: 'uuid' });
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('returns true (falls through to SessionAuthGuard 401) when session has no user', () => {
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bypasses the check when the handler is decorated with @AllowUnverified', () => {
    const handler = () => {};
    Reflect.defineMetadata(ALLOW_UNVERIFIED_KEY, true, handler);
    const ctx = makeContext({ id: 1, _id: 'uuid', verifiedAt: null }, handler);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bypasses the check when the class is decorated with @AllowUnverified', () => {
    class MyController {}
    Reflect.defineMetadata(ALLOW_UNVERIFIED_KEY, true, MyController);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ session: { user: { id: 1, verifiedAt: null } } }),
      }),
      getHandler: () => () => {},
      getClass: () => MyController,
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
