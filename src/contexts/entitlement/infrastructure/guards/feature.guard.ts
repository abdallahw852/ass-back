import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUIRES_FEATURE_KEY } from '../../decorators/requires-feature.decorator';
import { ENTITLEMENT_SERVICE } from '../../domain/entitlement.service.interface';
import type { IEntitlementService } from '../../domain/entitlement.service.interface';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';

type SessionRequest = FastifyRequest & {
  session?: { user?: { id?: number; role?: string } };
};

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ENTITLEMENT_SERVICE)
    private readonly entitlementService: IEntitlementService,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      REQUIRES_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = request.session?.user;
    if (!user?.id) return true;

    const supplier = await this.supplierRepo.findOne({
      where: { userId: user.id },
    });
    if (!supplier) throw new ForbiddenException('Supplier profile not found.');

    const allowed = await this.entitlementService.can(
      supplier.id,
      requiredFeature,
    );
    if (!allowed)
      throw new ForbiddenException(
        `Feature '${requiredFeature}' is not available on your plan.`,
      );

    return true;
  }
}
