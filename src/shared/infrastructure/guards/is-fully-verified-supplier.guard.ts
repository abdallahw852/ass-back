import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SUPPLIER_REPOSITORY } from '../../../contexts/supplier/identity/domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../contexts/supplier/identity/domain/repositories/supplier.repository.interface';
import { SupplierVerificationStatus } from '../../../contexts/supplier/identity/domain/enums/supplier-verification-status.enum';
import { SupplierNotVerifiedException } from '../../../contexts/supplier/identity/domain/supplier-identity.exceptions';

type SessionRequest = FastifyRequest & {
  session: { user: { id: number; _id: string; email: string; role: string } };
};

@Injectable()
export class IsFullyVerifiedSupplier implements CanActivate {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const userId = request.session?.user?.id;
    const role = request.session?.user?.role;

    // Employees belong to an already-verified supplier — pass through.
    if (role === 'supplier_employee') return true;

    const supplier = await this.supplierRepository.findByUserId(userId);
    if (!supplier) {
      throw new SupplierNotVerifiedException(
        'No supplier profile found. Please complete registration first.',
      );
    }

    if (supplier.verificationStatus === SupplierVerificationStatus.PENDING) {
      throw new SupplierNotVerifiedException(
        'Your profile is incomplete. Please complete your supplier profile before proceeding.',
      );
    }

    if (
      supplier.verificationStatus === SupplierVerificationStatus.REJECTED ||
      supplier.verificationStatus ===
        SupplierVerificationStatus.PROFILE_COMPLETED
    ) {
      throw new SupplierNotVerifiedException(
        'Your account has not been approved by an administrator yet. Please wait for verification.',
      );
    }

    if (!supplier.isVerified) {
      throw new SupplierNotVerifiedException(
        'Your account has not been approved by an administrator yet. Please wait for verification.',
      );
    }

    return true;
  }
}
