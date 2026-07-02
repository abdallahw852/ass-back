import { registerDecorator, ValidationOptions } from 'class-validator';

export function MaxCurrentYear(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'maxCurrentYear',
      target: (object as { constructor: new (...args: unknown[]) => unknown })
        .constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'number' && value <= new Date().getFullYear();
        },
        defaultMessage() {
          return `${propertyName} must not exceed the current year (${new Date().getFullYear()}).`;
        },
      },
    });
  };
}
