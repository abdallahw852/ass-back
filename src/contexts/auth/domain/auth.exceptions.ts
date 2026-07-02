import {
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export class AuthInvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials.',
    });
  }
}

export class AuthUserNotVerifiedException extends ForbiddenException {
  constructor() {
    super({
      code: 'AUTH_USER_NOT_VERIFIED',
      message: 'Email verification required.',
      status: 'otp_sent',
    });
  }
}

export class AuthOtpInvalidOrExpiredException extends UnauthorizedException {
  constructor() {
    super({
      code: 'AUTH_OTP_INVALID_OR_EXPIRED',
      message: 'Invalid or expired verification code.',
    });
  }
}

export class AuthOtpLockedException extends ForbiddenException {
  constructor() {
    super({
      code: 'AUTH_OTP_LOCKED',
      message: 'Too many failed attempts. Please request a new code.',
    });
  }
}

export class AuthOtpResendCooldownException extends HttpException {
  constructor() {
    super(
      {
        code: 'AUTH_OTP_RESEND_COOLDOWN',
        message: 'Please wait before requesting a new code.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class AuthRateLimitedException extends HttpException {
  constructor() {
    super(
      {
        code: 'AUTH_RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class AuthAccountTypeMismatchException extends BadRequestException {
  constructor() {
    super({
      code: 'AUTH_ACCOUNT_TYPE_MISMATCH',
      message: 'The account type does not match the existing account.',
    });
  }
}

export class AuthPasswordSetupRequiredException extends ForbiddenException {
  constructor() {
    super({
      code: 'AUTH_PASSWORD_SETUP_REQUIRED',
      message: 'A password must be set before signing in.',
    });
  }
}

export class AuthPasswordPolicyViolationException extends BadRequestException {
  constructor(violations: string[]) {
    super({
      code: 'AUTH_PASSWORD_POLICY_VIOLATION',
      message: 'Password does not meet the required policy.',
      violations,
    });
  }
}

export class AuthEmailAlreadyRegisteredException extends BadRequestException {
  constructor() {
    super({
      code: 'AUTH_EMAIL_ALREADY_REGISTERED',
      message: 'An account with this email already exists.',
    });
  }
}

export class AuthInvalidResetTokenException extends BadRequestException {
  constructor() {
    super({
      code: 'AUTH_INVALID_RESET_TOKEN',
      message: 'The password reset link is invalid or has expired.',
    });
  }
}

export class AuthEmailAlreadyInUseException extends HttpException {
  constructor() {
    super(
      {
        code: 'AUTH_EMAIL_ALREADY_IN_USE',
        message: 'This email address is already in use.',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class AuthInvalidEmailChangeOtpException extends BadRequestException {
  constructor() {
    super({
      code: 'AUTH_INVALID_EMAIL_CHANGE_OTP',
      message: 'Invalid or expired email change code.',
    });
  }
}

export class AuthPhoneAlreadyInUseException extends HttpException {
  constructor() {
    super(
      {
        code: 'AUTH_PHONE_ALREADY_IN_USE',
        message:
          'This phone number is already associated with another account.',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class AuthUserSuspendedException extends ForbiddenException {
  constructor() {
    super({
      code: 'AUTH_USER_SUSPENDED',
      message: 'Your account has been suspended. Please contact support.',
    });
  }
}

export class AuthUserNotFoundException extends NotFoundException {
  constructor() {
    super({
      code: 'AUTH_USER_NOT_FOUND',
      message: 'User not found.',
    });
  }
}
