import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ConfirmEmailChangeCommand } from '../confirm-email-change.command';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { OTP_CODE_REPOSITORY } from '../../../domain/repositories/otp-code.repository.interface';
import type { IOtpCodeRepository } from '../../../domain/repositories/otp-code.repository.interface';
import { OtpService } from '../../../../../shared/infrastructure/services/otp.service';
import {
  AuthEmailAlreadyInUseException,
  AuthInvalidEmailChangeOtpException,
  AuthOtpLockedException,
} from '../../../domain/auth.exceptions';
import type { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';

const EMAIL_CHANGE_PURPOSE = 'email_change';

@CommandHandler(ConfirmEmailChangeCommand)
export class ConfirmEmailChangeHandler implements ICommandHandler<
  ConfirmEmailChangeCommand,
  UserOrmEntity
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(OTP_CODE_REPOSITORY)
    private readonly otpRepository: IOtpCodeRepository,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: ConfirmEmailChangeCommand): Promise<UserOrmEntity> {
    const record = await this.otpRepository.findLatestByUserIdAndPurpose(
      command.userId,
      EMAIL_CHANGE_PURPOSE,
    );

    if (!record || record.consumedAt)
      throw new AuthInvalidEmailChangeOtpException();
    if (new Date(record.expiresAt).getTime() < Date.now())
      throw new AuthInvalidEmailChangeOtpException();

    const maxAttempts = Number(
      this.configService.get<number>('OTP_MAX_ATTEMPTS') ?? 5,
    );
    if (record.attempts >= maxAttempts) throw new AuthOtpLockedException();

    const isValid = await this.otpService.compare(
      command.otpCode,
      record.codeHash,
    );
    if (!isValid) {
      await this.otpRepository.incrementAttempts(
        record.id,
        record.attempts + 1,
      );
      throw new AuthInvalidEmailChangeOtpException();
    }

    const consumed = await this.otpRepository.consumeById(record.id);
    if (!consumed) throw new AuthInvalidEmailChangeOtpException();

    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new AuthInvalidEmailChangeOtpException();

    const existing = await this.userRepository.findByEmailIncludingUnverified(
      record.email,
    );
    if (existing && existing.id !== user.id)
      throw new AuthEmailAlreadyInUseException();

    return this.userRepository.save({ ...user, email: record.email });
  }
}
