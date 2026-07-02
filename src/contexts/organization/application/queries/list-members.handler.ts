import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { ListMembersQuery } from './list-members.query';
import { SupplierMemberOrmEntity } from '../../infrastructure/persistence/supplier-member.orm-entity';

export interface MemberResult {
  id: string;
  name: string;
  email: string;
  jobRole: string;
  permissions: string[];
  status: string;
  createdAt: Date;
}

@QueryHandler(ListMembersQuery)
export class ListMembersHandler implements IQueryHandler<ListMembersQuery> {
  constructor(
    @InjectRepository(SupplierMemberOrmEntity, 'write')
    private readonly memberRepo: Repository<SupplierMemberOrmEntity>,
  ) {}

  async execute(query: ListMembersQuery): Promise<MemberResult[]> {
    const members = await this.memberRepo.find({
      where: { supplier_id: query.supplierId },
      order: { created_at: 'DESC' },
    });

    return members.map((m) => ({
      id: m._id,
      name: m.invited_name,
      email: m.invited_email,
      jobRole: m.job_role,
      permissions: m.permissions,
      status: m.status,
      createdAt: m.created_at,
    }));
  }
}
