import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProfileCommand } from '../update-profile.command';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';
import { AuthPhoneAlreadyInUseException } from '../../../domain/auth.exceptions';

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<
  UpdateProfileCommand,
  UserOrmEntity
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: UpdateProfileCommand): Promise<UserOrmEntity> {
    const user = await this.userRepository.findByPublicId(command.userPublicId);
    if (!user) throw new NotFoundException('User not found.');

    const { input } = command;

    if (input.phone !== undefined && input.phone !== user.phone) {
      const existing = await this.userRepository.findByPhone(input.phone);
      if (existing) throw new AuthPhoneAlreadyInUseException();
    }

    if (input.name !== undefined) user.name = input.name;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.avatarUrl !== undefined) user.avatar = input.avatarUrl;

    return this.userRepository.save(user);
  }
}
