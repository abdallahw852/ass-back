import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { validatePassword } from '../../contexts/auth/domain/value-objects/password-policy';

export function IsPasswordPolicyCompliant(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isPasswordPolicyCompliant',
      target: (object as { constructor: new (...args: unknown[]) => unknown })
        .constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          return validatePassword(value).valid;
        },
        defaultMessage(args: ValidationArguments) {
          const value = args.value as unknown;
          if (typeof value !== 'string') {
            return 'Password must be a string.';
          }
          const { violations } = validatePassword(value);
          return violations.length
            ? violations.join(' ')
            : 'Password does not meet the security policy requirements.';
        },
      },
    });
  };
}
