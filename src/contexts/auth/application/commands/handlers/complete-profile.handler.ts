import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CompleteProfileCommand } from '../complete-profile.command';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserOrmEntity } from '../../../infrastructure/persistence/user.orm-entity';

@CommandHandler(CompleteProfileCommand)
export class CompleteProfileHandler implements ICommandHandler<
  CompleteProfileCommand,
  UserOrmEntity
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: CompleteProfileCommand): Promise<UserOrmEntity> {
    const user = await this.userRepository.findByPublicId(command.userId);
    if (!user) throw new NotFoundException('User not found');
    return this.userRepository.save({
      ...user,
      name: command.name,
      phone: command.phone,
      ...(command.avatarUrl !== null && { avatar: command.avatarUrl }),
    });
  }
}
