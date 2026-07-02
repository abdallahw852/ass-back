import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { PaymentRecordOrmEntity } from '../infrastructure/persistence/payment-intent.orm-entity';
import { WithdrawalRequestOrmEntity } from '../../wallet/infrastructure/persistence/withdrawal-request.orm-entity';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class AdminTransactionsQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

interface TransactionItem {
  id: string;
  user: string;
  amount: string;
  type: 'credit' | 'debit' | 'refund';
  status: string;
  date: Date;
}

@Controller('admin/transactions')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminTransactionsController {
  constructor(
    @InjectRepository(PaymentRecordOrmEntity, 'write')
    private readonly paymentRepo: Repository<PaymentRecordOrmEntity>,
    @InjectRepository(WithdrawalRequestOrmEntity, 'write')
    private readonly withdrawalRepo: Repository<WithdrawalRequestOrmEntity>,
  ) {}

  @Get()
  async listTransactions(@Query() dto: AdminTransactionsQueryDto): Promise<{
    items: TransactionItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const allItems: TransactionItem[] = [];

    // Fetch payment records (credits)
    if (!dto.type || dto.type === 'credit') {
      const payments = await this.paymentRepo.find({
        where: dto.status ? { status: dto.status } : undefined,
        order: { createdAt: 'DESC' },
      });
      for (const p of payments) {
        allItems.push({
          id: p._id,
          user: String(p.supplierId),
          amount: String(p.amount),
          type: 'credit',
          status: p.status,
          date: p.createdAt,
        });
      }
    }

    // Fetch withdrawal requests (debits)
    if (!dto.type || dto.type === 'debit') {
      const withdrawals = await this.withdrawalRepo.find({
        where: dto.status ? { status: dto.status } : undefined,
        order: { created_at: 'DESC' },
      });
      for (const w of withdrawals) {
        allItems.push({
          id: w._id,
          user: String(w.supplier_id),
          amount: String(w.amount),
          type: 'debit',
          status: w.status,
          date: w.created_at,
        });
      }
    }

    // Sort all by date descending
    allItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    const total = allItems.length;
    const offset = (page - 1) * limit;
    const items = allItems.slice(offset, offset + limit);

    return { items, total, page, limit };
  }
}
