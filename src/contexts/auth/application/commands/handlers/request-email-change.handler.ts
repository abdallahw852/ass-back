import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { RequestEmailChangeCommand } from '../request-email-change.command';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { OTP_CODE_REPOSITORY } from '../../../domain/repositories/otp-code.repository.interface';
import type { IOtpCodeRepository } from '../../../domain/repositories/otp-code.repository.interface';
import { OtpService } from '../../../../../shared/infrastructure/services/otp.service';
import { EmailService } from '../../../../../shared/infrastructure/services/email.service';
import { AuthEmailAlreadyInUseException } from '../../../domain/auth.exceptions';

const EMAIL_CHANGE_PURPOSE = 'email_change';

@CommandHandler(RequestEmailChangeCommand)
export class RequestEmailChangeHandler implements ICommandHandler<
  RequestEmailChangeCommand,
  { success: true }
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(OTP_CODE_REPOSITORY)
    private readonly otpRepository: IOtpCodeRepository,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: RequestEmailChangeCommand,
  ): Promise<{ success: true }> {
    const newEmail = command.newEmail.trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(newEmail);
    if (existing) throw new AuthEmailAlreadyInUseException();

    const ttl = Number(
      this.configService.get<number>('OTP_TTL_SECONDS') ?? 600,
    );
    const length = Number(this.configService.get<number>('OTP_LENGTH') ?? 6);
    const code = this.otpService.generate(length);
    const codeHash = await this.otpService.hash(code);

    await this.otpRepository.invalidateActiveByUserIdAndPurpose(
      command.userId,
      EMAIL_CHANGE_PURPOSE,
    );

    await this.otpRepository.createRecord({
      email: newEmail,
      codeHash,
      expiresAt: new Date(Date.now() + ttl * 1000),
      purpose: EMAIL_CHANGE_PURPOSE,
      userId: command.userId,
    });

    await this.emailService.sendOtpEmail(newEmail, code, ttl);

    return { success: true };
  }
}
