import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './presentation/auth.controller';
import { AdminUsersController } from './presentation/admin-users.controller';
import { AdminRolesController } from './presentation/admin-roles.controller';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { OtpCodeOrmEntity } from './infrastructure/persistence/otp-code.orm-entity';
import { LoginActivityOrmEntity } from './infrastructure/persistence/login-activity.orm-entity';
import { RoleOrmEntity } from './infrastructure/persistence/role.orm-entity';
import { RolePermissionOrmEntity } from './infrastructure/persistence/role-permission.orm-entity';
import { SupplierMemberOrmEntity } from '../organization/infrastructure/persistence/supplier-member.orm-entity';
import { SubscriptionOrmEntity } from '../supplier/subscription/infrastructure/persistence/subscription.orm-entity';
import { SharedModule } from '../../shared/shared.module';
import { RequestOtpHandler } from './application/commands/handlers/request-otp.handler';
import { VerifyOtpHandler } from './application/commands/handlers/verify-otp.handler';
import { LogoutHandler } from './application/commands/handlers/logout.handler';
import { CompleteProfileHandler } from './application/commands/handlers/complete-profile.handler';
import { UpdateProfileHandler } from './application/commands/handlers/update-profile.handler';
import { RequestEmailChangeHandler } from './application/commands/handlers/request-email-change.handler';
import { ConfirmEmailChangeHandler } from './application/commands/handlers/confirm-email-change.handler';
import { RegisterUserHandler } from './application/commands/register-user.handler';
import { LoginHandler } from './application/commands/login.handler';
import { SetInitialPasswordHandler } from './application/commands/set-initial-password.handler';
import { ForgotPasswordHandler } from './application/commands/forgot-password.handler';
import { ResetPasswordHandler } from './application/commands/reset-password.handler';
import { ChangePasswordHandler } from './application/commands/handlers/change-password.handler';
import { GetCurrentUserHandler } from './application/queries/handlers/get-current-user.handler';
import { ListLoginActivityHandler } from './application/queries/handlers/list-login-activity.handler';
import { ListAdminUsersHandler } from './application/queries/handlers/list-admin-users.handler';
import { GetAdminUserHandler } from './application/queries/handlers/get-admin-user.handler';
import { UpdateUserStatusHandler } from './application/commands/handlers/update-user-status.handler';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { LoginActivityListener } from './application/event-listeners/login-activity.listener';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { OtpCodeRepository } from './infrastructure/persistence/otp-code.repository';
import { LoginActivityRepository } from './infrastructure/persistence/login-activity.repository';
import { RolesInitService } from './infrastructure/persistence/roles-init.service';
import { BcryptPasswordAdapter } from './infrastructure/bcrypt-password.adapter';
import { OTP_CODE_REPOSITORY } from './domain/repositories/otp-code.repository.interface';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { LOGIN_ACTIVITY_REPOSITORY } from './domain/repositories/login-activity.repository.interface';
import { PASSWORD_PORT } from './application/ports/password.port';

const commandHandlers = [
  RequestOtpHandler,
  VerifyOtpHandler,
  LogoutHandler,
  CompleteProfileHandler,
  UpdateProfileHandler,
  RequestEmailChangeHandler,
  ConfirmEmailChangeHandler,
  RegisterUserHandler,
  LoginHandler,
  SetInitialPasswordHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
  ChangePasswordHandler,
  UpdateUserStatusHandler,
];
const queryHandlers = [
  GetCurrentUserHandler,
  ListLoginActivityHandler,
  ListAdminUsersHandler,
  GetAdminUserHandler,
];
const eventListeners = [LoginActivityListener];

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    AuditLogModule,
    ConfigModule,
    TypeOrmModule.forFeature(
      [
        UserOrmEntity,
        OtpCodeOrmEntity,
        LoginActivityOrmEntity,
        RoleOrmEntity,
        RolePermissionOrmEntity,
        SupplierMemberOrmEntity,
        SubscriptionOrmEntity,
      ],
      'write',
    ),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'changeme',
        signOptions: { expiresIn: '10m' },
      }),
    }),
  ],
  controllers: [AuthController, AdminUsersController, AdminRolesController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventListeners,
    UserRepository,
    OtpCodeRepository,
    LoginActivityRepository,
    RolesInitService,
    BcryptPasswordAdapter,
    { provide: USER_REPOSITORY, useExisting: UserRepository },
    { provide: OTP_CODE_REPOSITORY, useExisting: OtpCodeRepository },
    {
      provide: LOGIN_ACTIVITY_REPOSITORY,
      useExisting: LoginActivityRepository,
    },
    { provide: PASSWORD_PORT, useExisting: BcryptPasswordAdapter },
  ],
  exports: [{ provide: USER_REPOSITORY, useExisting: UserRepository }],
})
export class AuthModule {}
