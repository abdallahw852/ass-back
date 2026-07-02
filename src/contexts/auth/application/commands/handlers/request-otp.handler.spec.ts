import { UnauthorizedException } from '@nestjs/common';
import type { IOtpCodeRepository } from '../../../domain/repositories/otp-code.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { IPasswordPort } from '../../ports/password.port';
import { UserRole } from '../../../domain/enums/user-role.enum';
import { OtpCodeOrmEntity } from '../../../infrastructure/persistence/otp-code.orm-entity';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';
import { RequestOtpCommand } from '../request-otp.command';
import { RequestOtpHandler } from './request-otp.handler';

describe('RequestOtpHandler', () => {
  const otpCodeRepository = {
    createRecord: jest.fn<
      Promise<OtpCodeOrmEntity>,
      [Partial<OtpCodeOrmEntity>]
    >(),
    findLatestByEmail: jest.fn<Promise<OtpCodeOrmEntity | null>, [string]>(),
    findLatestByEmailAndPurpose: jest.fn<
      Promise<OtpCodeOrmEntity | null>,
      [string, string]
    >(),
    invalidateActiveByEmailAndPurpose: jest.fn<
      Promise<void>,
      [string, string]
    >(),
    consumeById: jest.fn<Promise<boolean>, [number]>(),
    incrementAttempts: jest.fn<Promise<void>, [number, number]>(),
    markConsumed: jest.fn<Promise<void>, [number]>(),
  };
  const userRepository = {
    findById: jest.fn<Promise<UserOrmEntity | null>, [number]>(),
    findByEmail: jest.fn<Promise<UserOrmEntity | null>, [string]>(),
    findByEmailIncludingUnverified: jest.fn<
      Promise<UserOrmEntity | null>,
      [string]
    >(),
    findByPublicId: jest.fn<Promise<UserOrmEntity | null>, [string]>(),
    save: jest.fn<Promise<UserOrmEntity>, [Partial<UserOrmEntity>]>(),
    updateVerification: jest.fn<Promise<void>, [number, Date]>(),
    updatePassword: jest.fn<Promise<void>, [number, string]>(),
    markRequiresPasswordSetup: jest.fn<Promise<void>, [number, boolean]>(),
  };
  const otpService = {
    generate: jest.fn<string, [number]>(),
    hash: jest.fn<Promise<string>, [string]>(),
    compare: jest.fn<Promise<boolean>, [string, string]>(),
  };
  const emailService = {
    sendOtpEmail: jest.fn<Promise<void>, [string, string, number]>(),
  };
  const configService = {
    get: jest.fn<number | undefined, [string]>(),
  };
  const passwordPort = {
    hash: jest.fn<Promise<string>, [string]>(),
    compare: jest.fn<Promise<boolean>, [string, string]>(),
    dummyHash: jest.fn<Promise<void>, [string]>(),
  };

  let handler: RequestOtpHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      if (key === 'OTP_RESEND_WINDOW_SECONDS') return 60;
      if (key === 'OTP_LENGTH') return 6;
      if (key === 'OTP_TTL_SECONDS') return 300;
      return undefined;
    });
    passwordPort.dummyHash.mockResolvedValue();

    handler = new RequestOtpHandler(
      otpCodeRepository as IOtpCodeRepository,
      userRepository as IUserRepository,
      otpService as never,
      emailService as never,
      configService as never,
      passwordPort as never,
    );
  });

  it('rejects admin OTP requests for emails that are not admins', async () => {
    userRepository.findByEmailIncludingUnverified.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      role: UserRole.USER,
      verifiedAt: new Date(),
    } as UserOrmEntity);

    await expect(
      handler.execute(new RequestOtpCommand('user@example.com', 'admin')),
    ).rejects.toThrow(UnauthorizedException);

    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  it('sends OTPs for existing admin users', async () => {
    userRepository.findByEmailIncludingUnverified.mockResolvedValue({
      id: 2,
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      verifiedAt: new Date(),
    } as UserOrmEntity);
    otpCodeRepository.findLatestByEmailAndPurpose.mockResolvedValue(null);
    otpCodeRepository.invalidateActiveByEmailAndPurpose.mockResolvedValue();
    otpService.generate.mockReturnValue('123456');
    otpService.hash.mockResolvedValue('hashed-code');
    emailService.sendOtpEmail.mockResolvedValue();
    otpCodeRepository.createRecord.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      codeHash: 'hashed-code',
      expiresAt: new Date(),
      attempts: 0,
      consumedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as OtpCodeOrmEntity);

    await expect(
      handler.execute(new RequestOtpCommand('admin@example.com', 'admin')),
    ).resolves.toEqual({
      isNewUser: false,
    });

    expect(otpService.generate).toHaveBeenCalledWith(6);
    expect(otpCodeRepository.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        codeHash: 'hashed-code',
      }),
    );
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
      'admin@example.com',
      '123456',
      300,
    );
  });
});

// ---------------------------------------------------------------------------
// US4 — extended tests for the updated RequestOtpHandler behaviour
// These tests MUST FAIL until T049 (handler update) is implemented.
// ---------------------------------------------------------------------------

class FakeUserRepoForResend implements IUserRepository {
  private store: UserOrmEntity[] = [];

  seed(data: Partial<UserOrmEntity>): void {
    this.store.push(
      Object.assign(new UserOrmEntity(), {
        id: this.store.length + 1,
        _id: `uuid-${this.store.length + 1}`,
        ...data,
      }),
    );
  }

  findById(): Promise<UserOrmEntity | null> {
    return Promise.resolve(null);
  }
  findByEmail(email: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.email === email) ?? null);
  }
  findByEmailIncludingUnverified(email: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u.email === email) ?? null);
  }
  findByPublicId(id: string): Promise<UserOrmEntity | null> {
    return Promise.resolve(this.store.find((u) => u._id === id) ?? null);
  }
  save(u: Partial<UserOrmEntity>): Promise<UserOrmEntity> {
    return Promise.resolve(Object.assign(new UserOrmEntity(), u));
  }
  updateVerification(id: number, verifiedAt: Date): Promise<void> {
    const u = this.store.find((x) => x.id === id);
    if (u) u.verifiedAt = verifiedAt;
    return Promise.resolve();
  }
  updatePassword(id: number, passwordHash: string): Promise<void> {
    const u = this.store.find((x) => x.id === id);
    if (u) u.passwordHash = passwordHash;
    return Promise.resolve();
  }
  markRequiresPasswordSetup(id: number, value: boolean): Promise<void> {
    const u = this.store.find((x) => x.id === id);
    if (u) u.requiresPasswordSetup = value;
    return Promise.resolve();
  }
}

class FakeOtpRepoForResend implements IOtpCodeRepository {
  invalidateCalls = 0;
  createCalls = 0;
  createRecord(): ReturnType<IOtpCodeRepository['createRecord']> {
    this.createCalls++;
    return Promise.resolve({} as never);
  }
  findLatestByEmail(): Promise<null> {
    return Promise.resolve(null);
  }
  findLatestByEmailAndPurpose(): Promise<null> {
    return Promise.resolve(null);
  }
  invalidateActiveByEmailAndPurpose(): Promise<void> {
    this.invalidateCalls++;
    return Promise.resolve();
  }
  consumeById(): Promise<boolean> {
    return Promise.resolve(true);
  }
  incrementAttempts(): Promise<void> {
    return Promise.resolve();
  }
  markConsumed(): Promise<void> {
    return Promise.resolve();
  }
}

class FakePasswordPortForResend implements IPasswordPort {
  dummyHashCalls = 0;
  hash(): Promise<string> {
    return Promise.resolve('$2b$12$hash');
  }
  compare(): Promise<boolean> {
    return Promise.resolve(false);
  }
  dummyHash(): Promise<void> {
    this.dummyHashCalls++;
    return Promise.resolve();
  }
}

class FakeOtpSvcForResend {
  generate(_length: number): string {
    return '654321';
  }
  hash(): Promise<string> {
    return Promise.resolve('$2b$10$otphash');
  }
  compare(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class FakeEmailSvcForResend {
  sendOtpEmail(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeCfgForResend {
  get(key: string): unknown {
    const map: Record<string, unknown> = {
      OTP_RESEND_WINDOW_SECONDS: 60,
      OTP_LENGTH: 6,
      OTP_TTL_SECONDS: 300,
    };
    return map[key];
  }
}

function makeResendHandler(
  userRepo: IUserRepository,
  otpRepo: IOtpCodeRepository,
  pwdPort: IPasswordPort,
) {
  return new RequestOtpHandler(
    otpRepo as never,
    userRepo as never,
    new FakeOtpSvcForResend() as never,
    new FakeEmailSvcForResend() as never,
    new FakeCfgForResend() as never,
    pwdPort as never,
  );
}

describe('RequestOtpHandler (US4 — updated behaviour)', () => {
  it('does not call console.log with the OTP code', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const userRepo = new FakeUserRepoForResend();
    userRepo.seed({
      email: 'alice@example.com',
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
      role: UserRole.BUYER,
    });
    const handler = makeResendHandler(
      userRepo,
      new FakeOtpRepoForResend(),
      new FakePasswordPortForResend(),
    );

    await handler.execute(new RequestOtpCommand('alice@example.com'));

    const otpLogCalls = consoleSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('OTP'),
    );
    expect(otpLogCalls).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('invalidates prior active OTPs before issuing a new one for an unverified user', async () => {
    const userRepo = new FakeUserRepoForResend();
    userRepo.seed({
      email: 'bob@example.com',
      verifiedAt: null,
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
      role: UserRole.BUYER,
    });
    const otpRepo = new FakeOtpRepoForResend();
    const handler = makeResendHandler(
      userRepo,
      otpRepo,
      new FakePasswordPortForResend(),
    );

    await handler.execute(new RequestOtpCommand('bob@example.com'));

    expect(otpRepo.invalidateCalls).toBe(1);
    expect(otpRepo.createCalls).toBe(1);
  });

  it('returns success for a verified email without issuing OTP (anti-enumeration via dummyHash)', async () => {
    const userRepo = new FakeUserRepoForResend();
    userRepo.seed({
      email: 'carol@example.com',
      verifiedAt: new Date(),
      passwordHash: '$2b$12$hash',
      requiresPasswordSetup: false,
      role: UserRole.BUYER,
    });
    const otpRepo = new FakeOtpRepoForResend();
    const pwdPort = new FakePasswordPortForResend();
    const handler = makeResendHandler(userRepo, otpRepo, pwdPort);

    await handler.execute(new RequestOtpCommand('carol@example.com'));

    expect(otpRepo.createCalls).toBe(0);
    expect(pwdPort.dummyHashCalls).toBe(1);
  });

  it('returns success for an unknown email without issuing OTP (anti-enumeration via dummyHash)', async () => {
    const otpRepo = new FakeOtpRepoForResend();
    const pwdPort = new FakePasswordPortForResend();
    const handler = makeResendHandler(
      new FakeUserRepoForResend(),
      otpRepo,
      pwdPort,
    );

    await handler.execute(new RequestOtpCommand('nobody@example.com'));

    expect(otpRepo.createCalls).toBe(0);
    expect(pwdPort.dummyHashCalls).toBe(1);
  });
});
