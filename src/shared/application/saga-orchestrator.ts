import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class SagaOrchestrator {
  abstract execute(input: Record<string, unknown>): Promise<void>;
}
