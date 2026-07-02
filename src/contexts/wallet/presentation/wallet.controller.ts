import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { SupplierWalletOrmEntity } from '../infrastructure/persistence/supplier-wallet.orm-entity';
import { PayoutMethodOrmEntity } from '../infrastructure/persistence/payout-method.orm-entity';
import { WithdrawalRequestOrmEntity } from '../infrastructure/persistence/withdrawal-request.orm-entity';
import { SUPPLIER_REPOSITORY } from '../../supplier/identity/domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../supplier/identity/domain/repositories/supplier.repository.interface';
import { AddPayoutMethodCommand } from '../application/commands/add-payout-method.command';
import { RequestWithdrawalCommand } from '../application/commands/request-withdrawal.command';
import { ListPayoutMethodsQuery } from '../application/queries/list-payout-methods.query';
import { ListWithdrawalsQuery } from '../application/queries/list-withdrawals.query';
import { AddPayoutMethodDto } from './dto/add-payout-method.dto';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';

type SessionRequest = FastifyRequest & {
  session: { user: { id: number; role: string } };
};

@UseGuards(SessionAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @InjectRepository(SupplierWalletOrmEntity, 'write')
    private readonly walletRepo: Repository<SupplierWalletOrmEntity>,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  @Get('me')
  async getMyWallet(@Req() req: SessionRequest): Promise<{
    supplierId: number;
    balance: number;
    currency: string;
    updatedAt: Date;
  }> {
    const userId = req.session.user.id;
    const supplier = await this.supplierRepository.findByUserId(userId);
    if (!supplier) {
      return {
        supplierId: userId,
        balance: 0,
        currency: 'SAR',
        updatedAt: new Date(),
      };
    }

    const wallet = await this.walletRepo.findOne({
      where: { supplier_id: supplier.id },
    });
    if (!wallet) {
      return {
        supplierId: supplier.id,
        balance: 0,
        currency: 'SAR',
        updatedAt: new Date(),
      };
    }
    return {
      supplierId: wallet.supplier_id,
      balance: Number(wallet.balance),
      currency: wallet.currency,
      updatedAt: wallet.updated_at,
    };
  }

  @Post('payout-methods')
  @HttpCode(201)
  async addPayoutMethod(
    @Body() dto: AddPayoutMethodDto,
    @Req() req: SessionRequest,
  ): Promise<{
    id: string;
    type: string;
    bankName: string;
    accountName: string;
    ibanMasked: string;
    createdAt: Date;
  }> {
    const supplierId = await this.resolveSupplierId(req);
    const method: PayoutMethodOrmEntity = await this.commandBus.execute(
      new AddPayoutMethodCommand(
        supplierId,
        dto.type,
        dto.bankName,
        dto.accountName,
        dto.iban,
      ),
    );
    return this.formatPayoutMethod(method);
  }

  @Get('payout-methods')
  async listPayoutMethods(@Req() req: SessionRequest): Promise<
    {
      id: string;
      type: string;
      bankName: string;
      accountName: string;
      ibanMasked: string;
      createdAt: Date;
    }[]
  > {
    const supplierId = await this.resolveSupplierId(req);
    const methods: PayoutMethodOrmEntity[] = await this.queryBus.execute(
      new ListPayoutMethodsQuery(supplierId),
    );
    return methods.map((m) => this.formatPayoutMethod(m));
  }

  @Post('withdrawals')
  @HttpCode(201)
  async requestWithdrawal(
    @Body() dto: RequestWithdrawalDto,
    @Req() req: SessionRequest,
  ): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    payoutMethodId: string;
    createdAt: Date;
  }> {
    const supplierId = await this.resolveSupplierId(req);
    const withdrawal: WithdrawalRequestOrmEntity =
      await this.commandBus.execute(
        new RequestWithdrawalCommand(
          supplierId,
          dto.amount,
          dto.payoutMethodId,
        ),
      );
    return this.formatWithdrawal(withdrawal);
  }

  @Get('withdrawals')
  async listWithdrawals(@Req() req: SessionRequest): Promise<
    {
      id: string;
      amount: number;
      currency: string;
      status: string;
      payoutMethodId: string;
      createdAt: Date;
    }[]
  > {
    const supplierId = await this.resolveSupplierId(req);
    const withdrawals: WithdrawalRequestOrmEntity[] =
      await this.queryBus.execute(new ListWithdrawalsQuery(supplierId));
    return withdrawals.map((w) => this.formatWithdrawal(w));
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async resolveSupplierId(req: SessionRequest): Promise<number> {
    const userId = req.session.user.id;
    const supplier = await this.supplierRepository.findByUserId(userId);
    if (!supplier) {
      return 0;
    }
    return supplier.id;
  }

  private formatPayoutMethod(method: PayoutMethodOrmEntity): {
    id: string;
    type: string;
    bankName: string;
    accountName: string;
    ibanMasked: string;
    createdAt: Date;
  } {
    const ibanStr = method.iban ?? '';
    const ibanMasked =
      ibanStr.length >= 4 ? `****${ibanStr.slice(-4)}` : ibanStr;
    return {
      id: method._id,
      type: method.type,
      bankName: method.bank_name,
      accountName: method.account_name,
      ibanMasked,
      createdAt: method.created_at,
    };
  }

  private formatWithdrawal(withdrawal: WithdrawalRequestOrmEntity): {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payoutMethodId: string;
    createdAt: Date;
  } {
    return {
      id: withdrawal._id,
      amount: Number(withdrawal.amount),
      currency: withdrawal.currency,
      status: withdrawal.status,
      payoutMethodId: withdrawal.payout_method_id,
      createdAt: withdrawal.created_at,
    };
  }
}
