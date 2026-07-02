import { DomainEvent } from '../../domain/domain-event.base';

/**
 * Context passed to SAGA steps
 */
export interface SagaContext {
  sagaId: string;
  data: Record<string, unknown>;
  events: DomainEvent[];
}

/**
 * Base interface for SAGA step
 * Each step represents an action in a distributed transaction
 */
export interface ISagaStep {
  /**
   * Execute the step (forward action)
   */
  execute(context: SagaContext): Promise<void>;

  /**
   * Compensate the step (rollback action)
   */
  compensate(context: SagaContext): Promise<void>;
}

/**
 * SAGA step result
 */
export interface SagaStepResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: Error;
}
