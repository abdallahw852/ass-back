import { HttpStatus } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import { RequestOtpCommand } from '../application/commands/request-otp.command';
import { VerifyOtpCommand } from '../application/commands/verify-otp.command';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  const commandBus = {
    execute: jest.fn<Promise<unknown>, [unknown]>(),
  };

  const queryBus = {
    execute: jest.fn<Promise<unknown>, [unknown]>(),
  };

  const storageService = {
    storeFile: jest.fn<Promise<string>, [unknown]>(),
    storeLocalFile: jest.fn<Promise<string>, [unknown]>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('dispatches admin OTP requests with the admin account type', async () => {
    commandBus.execute.mockResolvedValue({ isNewUser: false });

    await expect(
      controller.requestAdminOtp({ email: 'admin@example.com' }),
    ).resolves.toEqual({
      success: true,
      isNewUser: false,
    });

    const [command] = commandBus.execute.mock.calls[0] as [RequestOtpCommand];

    expect(command).toBeInstanceOf(RequestOtpCommand);
    expect(command.email).toBe('admin@example.com');
    expect(command.accountType).toBe('admin');
  });

  it('dispatches admin OTP verification with the dedicated admin role', async () => {
    const session = { sessionId: 'session_1' };
    const req = { session } as unknown as FastifyRequest;
    const status = jest.fn().mockReturnThis();
    const res = {
      status,
    } as unknown as FastifyReply;
    const verifiedAt = new Date('2026-01-01T12:00:00.000Z');
    const user = {
      _id: 'user_public_id',
      email: 'admin@example.com',
      role: 'admin',
      verifiedAt,
      requiresPasswordSetup: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastLoginAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    commandBus.execute.mockResolvedValue({ user, isNewUser: false });

    await expect(
      controller.verifyAdminOtp(
        { email: 'admin@example.com', code: '123456' },
        req,
        res,
      ),
    ).resolves.toEqual({
      user: {
        id: 'user_public_id',
        email: 'admin@example.com',
        name: null,
        phone: null,
        avatar: null,
        role: 'admin',
        permissions: null,
        verifiedAt,
        onboardingStep: 'complete',
        onboardingComplete: false,
        passwordSetupRequired: false,
        supplierPublicId: null,
        supplierNumber: null,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        status: { active: true, verified: false },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        lastLoginAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });

    const [command] = commandBus.execute.mock.calls[0] as [VerifyOtpCommand];

    expect(command).toBeInstanceOf(VerifyOtpCommand);
    expect(command.email).toBe('admin@example.com');
    expect(command.code).toBe('123456');
    expect(command.session).toBe(session);
    expect(command.accountType).toBeUndefined();
    expect(command.requiredRole).toBe('admin');
    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
  });
});
