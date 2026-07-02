import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { IndexDocumentCommand } from './index-document.command';
import { ElasticsearchService } from '../../infrastructure/elasticsearch.service';

@CommandHandler(IndexDocumentCommand)
export class IndexDocumentHandler implements ICommandHandler<IndexDocumentCommand> {
  constructor(private readonly es: ElasticsearchService) {}

  async execute(command: IndexDocumentCommand): Promise<void> {
    await this.es.index(command.document);
  }
}
