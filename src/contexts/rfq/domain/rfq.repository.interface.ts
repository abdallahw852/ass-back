import type { RfqAttachmentOrmEntity } from '../infrastructure/persistence/rfq-attachment.orm-entity';
import type { RfqCustomizationOrmEntity } from '../infrastructure/persistence/rfq-customization.orm-entity';
import type { RfqOrmEntity } from '../infrastructure/persistence/rfq.orm-entity';

export const RFQ_REPOSITORY = Symbol('RFQ_REPOSITORY');

export type SaveRfqInput = Partial<
  Omit<RfqOrmEntity, 'customizations' | 'attachments'>
> & {
  customizations?: Partial<RfqCustomizationOrmEntity>[];
  attachments?: Partial<RfqAttachmentOrmEntity>[];
};

export interface IRfqRepository {
  findByPublicId(publicId: string): Promise<RfqOrmEntity | null>;
  findByPublicIdWithRelations(publicId: string): Promise<RfqOrmEntity | null>;
  save(input: SaveRfqInput): Promise<RfqOrmEntity>;
  update(id: number, input: Partial<RfqOrmEntity>): Promise<RfqOrmEntity>;
}
