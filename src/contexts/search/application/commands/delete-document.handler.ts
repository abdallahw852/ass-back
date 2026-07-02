import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DeleteDocumentCommand } from './delete-document.command';
import { ElasticsearchService } from '../../infrastructure/elasticsearch.service';

@CommandHandler(DeleteDocumentCommand)
export class DeleteDocumentHandler implements ICommandHandler<DeleteDocumentCommand> {
  constructor(private readonly es: ElasticsearchService) {}

  async execute(command: DeleteDocumentCommand): Promise<void> {
    await this.es.delete(command.productId);
  }
}
