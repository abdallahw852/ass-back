import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { RemoveMemberCommand } from './remove-member.command';
import { SupplierMemberOrmEntity } from '../../infrastructure/persistence/supplier-member.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { UserRole } from '../../../auth/domain/enums/user-role.enum';
import { MemberNotFoundException } from '../../domain/organization.exceptions';

@CommandHandler(RemoveMemberCommand)
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand> {
  constructor(
    @InjectRepository(SupplierMemberOrmEntity, 'write')
    private readonly memberRepo: Repository<SupplierMemberOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    const { memberId, supplierId } = command;

    const member = await this.memberRepo.findOne({
      where: { _id: memberId, supplier_id: supplierId },
    });

    if (!member) {
      throw new MemberNotFoundException(memberId);
    }

    await this.memberRepo.remove(member);

    if (member.user_id !== null) {
      await this.userRepo.update(member.user_id, {
        supplierId: null,
        role: UserRole.USER,
      });
    }
  }
}
