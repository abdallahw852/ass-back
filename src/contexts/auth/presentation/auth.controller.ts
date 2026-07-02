import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RequestOtpDto } from './dto/request-otp.dto';
import { RequestAdminOtpDto } from './dto/request-admin-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { SwitchViewDto } from './dto/switch-view.dto';
import { RequestOtpCommand } from '../application/commands/request-otp.command';
import type { RequestOtpResult } from '../application/commands/handlers/request-otp.handler';
import { VerifyOtpCommand } from '../application/commands/verify-otp.command';
import { RegisterUserCommand } from '../application/commands/register-user.command';
import type { RegisterUserResult } from '../application/commands/register-user.handler';
import { LoginCommand } from '../application/commands/login.command';
import type { LoginResult } from '../application/commands/login.handler';
import { SetInitialPasswordCommand } from '../application/commands/set-initial-password.command';
import type { SetInitialPasswordResult } from '../application/commands/set-initial-password.handler';
import { SetInitialPasswordDto } from './dto/set-initial-password.dto';
import { ForgotPasswordCommand } from '../application/commands/forgot-password.command';
import type { ForgotPasswordResult } from '../application/commands/forgot-password.handler';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordCommand } from '../application/commands/reset-password.command';
import type { ResetPasswordResult } from '../application/commands/reset-password.handler';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileCommand } from '../application/commands/update-profile.command';
import { ChangePasswordCommand } from '../application/commands/change-password.command';
import type { ChangePasswordResult } from '../application/commands/handlers/change-password.handler';
import { RequestEmailChangeCommand } from '../application/commands/request-email-change.command';
import { ConfirmEmailChangeCommand } from '../application/commands/confirm-email-change.command';
import { LogoutCommand } from '../application/commands/logout.command';
import { GetCurrentUserQuery } from '../application/queries/get-current-user.query';
import { ListLoginActivityQuery } from '../application/queries/list-login-activity.query';
import type { LoginActivityResult } from '../application/queries/handlers/list-login-activity.handler';
import { AuthFormatter } from './auth.formatter';
import type { VerifyOtpResult } from '../application/commands/handlers/verify-otp.handler';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import { AllowUnverified } from '../../../shared/decorators/allow-unverified.decorator';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';

type FastifySession = {
  sessionId: string;
  user?: {
    id: number;
    _id: string;
    email: string;
    role: string;
    verifiedAt?: Date | null;
    viewAs?: 'buyer';
  };
} & Record<string, unknown>;

type SessionRequest = FastifyRequest & { session: FastifySession };

type MultipartFile = {
  toBuffer: () => Promise<Buffer>;
  filename: string;
  mimetype: string;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly storageService: StorageService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @AllowUnverified()
  @Throttle({ 'otp-issue': { limit: 5, ttl: 3600000 } })
  async register(@Body() dto: RegisterDto): Promise<RegisterUserResult> {
    const avatarPart = dto.avatar as MultipartFile | undefined;
    let avatarUrl: string | null = null;
    if (avatarPart?.toBuffer) {
      const buffer = await avatarPart.toBuffer();
      avatarUrl = await this.storageService.storeFile({
        buffer,
        originalName: avatarPart.filename,
        mimeType: avatarPart.mimetype,
        destinationDir: 'uploads/avatars',
      });
    }

    return this.commandBus.execute(
      new RegisterUserCommand(
        dto.email,
        dto.password,
        dto.accountType,
        dto.name,
        dto.phone,
        avatarUrl,
      ),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AllowUnverified()
  @Throttle({ login: { limit: 10, ttl: 900000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
  ): Promise<LoginResult> {
    const session = (req as SessionRequest).session;
    const ip = req.ip ?? '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? '';
    return this.commandBus.execute(
      new LoginCommand(dto.email, dto.password, ip, session, userAgent),
    );
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @AllowUnverified()
  @Throttle({ 'otp-issue': { limit: 5, ttl: 3600000 } })
  async requestOtp(
    @Body() dto: RequestOtpDto,
  ): Promise<{ success: boolean; isNewUser: boolean }> {
    const result: RequestOtpResult = await this.commandBus.execute(
      new RequestOtpCommand(dto.email),
    );
    return { success: true, isNewUser: result.isNewUser };
  }

  @Post('admin/request-otp')
  @HttpCode(HttpStatus.OK)
  @AllowUnverified()
  @Throttle({ 'otp-issue': { limit: 5, ttl: 3600000 } })
  async requestAdminOtp(
    @Body() dto: RequestAdminOtpDto,
  ): Promise<{ success: boolean; isNewUser: boolean }> {
    const result: RequestOtpResult = await this.commandBus.execute(
      new RequestOtpCommand(dto.email, 'admin'),
    );
    return { success: true, isNewUser: result.isNewUser };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @AllowUnverified()
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) _res: FastifyReply,
  ): Promise<VerifyOtpResult & { user?: Record<string, unknown> }> {
    const session = (req as SessionRequest).session;
    const result: VerifyOtpResult = await this.commandBus.execute(
      new VerifyOtpCommand(dto.email, dto.code, session),
    );

    // On successful verification the session user is populated, so enrich the
    // response with the formatted user (incl. onboardingStep) to let the client
    // resume an abandoned signup at the right step. The passwordSetupRequired
    // branch has no session user yet, so it is returned untouched.
    if ('status' in result && result.status === 'verified') {
      const publicId = session?.user?._id;
      if (publicId) {
        const raw = (await this.queryBus.execute(
          new GetCurrentUserQuery(publicId),
        )) as unknown as Record<string, unknown> | null;
        if (raw) {
          return {
            ...result,
            user: await AuthFormatter.user(raw, this.storageService),
          };
        }
      }
    }

    return result;
  }

  @Post('admin/verify-otp')
  @AllowUnverified()
  @Throttle({ login: { limit: 10, ttl: 900000 } })
  async verifyAdminOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ user: Record<string, unknown> }> {
    const session = (req as SessionRequest).session;
    const result = (await this.commandBus.execute(
      new VerifyOtpCommand(dto.email, dto.code, session, undefined, 'admin'),
    )) as unknown as { user: Record<string, unknown> };
    res.status(HttpStatus.OK);
    return {
      user: await AuthFormatter.user(result.user, this.storageService),
    };
  }

  @Post('set-initial-password')
  @HttpCode(HttpStatus.OK)
  @AllowUnverified()
  @Throttle({ login: { limit: 10, ttl: 900000 } })
  async setInitialPassword(
    @Body() dto: SetInitialPasswordDto,
    @Req() req: FastifyRequest,
  ): Promise<SetInitialPasswordResult> {
    const session = (req as SessionRequest).session;
    return this.commandBus.execute(
      new SetInitialPasswordCommand(
        dto.passwordSetupToken,
        dto.password,
        session,
      ),
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @AllowUnverified()
  @Throttle({ 'otp-issue': { limit: 5, ttl: 3600000 } })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResult> {
    return this.commandBus.execute(new ForgotPasswordCommand(dto.email));
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @AllowUnverified()
  @Throttle({ login: { limit: 10, ttl: 900000 } })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<ResetPasswordResult> {
    const token = this.extractBearerToken(authHeader);
    return this.commandBus.execute(
      new ResetPasswordCommand(token, dto.password),
    );
  }

  private extractBearerToken(authHeader?: string): string {
    if (!authHeader) return '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return '';
    return token.trim();
  }

  @Get('me')
  @AllowUnverified()
  async me(
    @Req() req: FastifyRequest,
  ): Promise<{ user: Record<string, unknown> | null }> {
    const session = (req as SessionRequest).session;
    const publicId = session?.user?._id;
    const viewAs = session?.user?.viewAs ?? null;
    const raw = publicId
      ? ((await this.queryBus.execute(
          new GetCurrentUserQuery(publicId),
        )) as unknown as Record<string, unknown>)
      : null;
    const formatted = raw
      ? await AuthFormatter.user(raw, this.storageService)
      : null;
    return {
      user: formatted ? { ...formatted, viewAs } : null,
    };
  }

  @Patch('switch-view')
  @UseGuards(SessionAuthGuard)
  async switchView(
    @Body() dto: SwitchViewDto,
    @Req() req: FastifyRequest,
  ): Promise<{ viewAs: 'buyer' | null }> {
    const session = (req as SessionRequest).session;
    if (!session?.user) throw new UnauthorizedException();
    if (session.user.role !== 'supplier') {
      throw new ForbiddenException('Only suppliers can switch views.');
    }
    if (dto.viewAs === 'buyer') {
      session.user = { ...session.user, viewAs: 'buyer' };
    } else {
      session.user = { ...session.user, viewAs: undefined };
    }
    if (typeof session.save === 'function') {
      await session.save();
    }
    return { viewAs: session.user.viewAs ?? null };
  }

  @Patch('profile')
  @UseGuards(SessionAuthGuard)
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: FastifyRequest,
  ): Promise<{ user: Record<string, unknown> }> {
    const session = (req as SessionRequest).session;
    const userId = session?.user?._id;
    if (!userId) throw new UnauthorizedException();

    const avatarPart = dto.avatar as MultipartFile | undefined;
    let avatarUrl: string | null | undefined;
    if (avatarPart?.toBuffer) {
      const buffer = await avatarPart.toBuffer();
      avatarUrl = await this.storageService.storeFile({
        buffer,
        originalName: avatarPart.filename,
        mimeType: avatarPart.mimetype,
        destinationDir: 'uploads/avatars',
      });
    }

    const user = (await this.commandBus.execute(
      new UpdateProfileCommand(userId, {
        name: dto.name,
        phone: dto.phone,
        avatarUrl,
      }),
    )) as unknown as Record<string, unknown>;
    return { user: await AuthFormatter.user(user, this.storageService) };
  }

  @Patch('change-password')
  @UseGuards(SessionAuthGuard)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: FastifyRequest,
  ): Promise<ChangePasswordResult> {
    const session = (req as SessionRequest).session;
    const userId = session?.user?.id;
    if (!userId) throw new UnauthorizedException();

    return (await this.commandBus.execute(
      new ChangePasswordCommand(userId, dto.currentPassword, dto.newPassword),
    )) as unknown as ChangePasswordResult;
  }

  @Post('email-change/request')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ 'otp-issue': { limit: 5, ttl: 3600000 } })
  async requestEmailChange(
    @Body() dto: RequestEmailChangeDto,
    @Req() req: FastifyRequest,
  ): Promise<{ success: boolean }> {
    const session = (req as SessionRequest).session;
    if (!session?.user) throw new UnauthorizedException();

    await this.commandBus.execute(
      new RequestEmailChangeCommand(
        session.user.id,
        session.user._id,
        dto.newEmail,
      ),
    );
    return { success: true };
  }

  @Post('email-change/confirm')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmEmailChange(
    @Body() dto: ConfirmEmailChangeDto,
    @Req() req: FastifyRequest,
  ): Promise<{ user: Record<string, unknown> }> {
    const session = (req as SessionRequest).session;
    if (!session?.user) throw new UnauthorizedException();

    const user = (await this.commandBus.execute(
      new ConfirmEmailChangeCommand(
        session.user.id,
        session.user._id,
        dto.otpCode,
      ),
    )) as unknown as Record<string, unknown>;

    session.user = {
      ...session.user,
      email: user.email as string,
    };

    return { user: await AuthFormatter.user(user, this.storageService) };
  }

  @Get('login-activity')
  @UseGuards(SessionAuthGuard)
  async listLoginActivity(
    @Req() req: FastifyRequest,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const session = (req as SessionRequest).session;
    if (!session?.user) throw new UnauthorizedException();

    const limit = Math.min(
      Math.max(parseInt(limitStr ?? '20', 10) || 20, 1),
      100,
    );
    const offset = Math.max(parseInt(offsetStr ?? '0', 10) || 0, 0);

    const result = await this.queryBus.execute<
      ListLoginActivityQuery,
      LoginActivityResult
    >(new ListLoginActivityQuery(session.user.id, limit, offset));

    return {
      items: result.items.map((item) => ({
        id: item._id,
        ipAddress: item.ipAddress,
        location: item.location,
        device: item.device,
        status: item.status,
        failureReason: item.failureReason,
        createdAt: item.createdAt,
      })),
      total: result.total,
    };
  }

  @Delete('logout')
  @AllowUnverified()
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ success: boolean }> {
    const session = (req as SessionRequest).session;
    if (session) {
      await this.commandBus.execute(
        new LogoutCommand(session as unknown as Record<string, unknown>),
      );
    }
    (
      res as FastifyReply & {
        clearCookie: (name: string, opts?: Record<string, unknown>) => void;
      }
    ).clearCookie('sid', { path: '/' });
    return { success: true };
  }
}
