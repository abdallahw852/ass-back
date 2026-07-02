import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { InviteMemberCommand } from './invite-member.command';
import { SupplierMemberOrmEntity } from '../../infrastructure/persistence/supplier-member.orm-entity';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand> {
  constructor(
    @InjectRepository(SupplierMemberOrmEntity, 'write')
    private readonly memberRepo: Repository<SupplierMemberOrmEntity>,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: InviteMemberCommand): Promise<{ id: string }> {
    const { supplierId, name, email, jobRole, permissions } = command;

    const member = this.memberRepo.create({
      supplier_id: supplierId,
      invited_email: email,
      invited_name: name,
      job_role: jobRole,
      permissions,
      status: 'pending',
    });

    const saved = await this.memberRepo.save(member);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/invite/accept?token=${saved.invite_token}`;

    await this.emailService.sendTeamInviteEmail(email, inviteUrl, name);

    return { id: saved._id };
  }
}
