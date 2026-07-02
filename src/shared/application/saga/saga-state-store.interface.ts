import { SagaState } from './saga-orchestrator.base';

/**
 * Interface for storing SAGA state
 * Allows persistence of SAGA execution state for recovery
 */
export interface ISagaStateStore {
  save(state: SagaState): Promise<void>;
  findById(sagaId: string): Promise<SagaState | null>;
  update(state: SagaState): Promise<void>;
}

export const SAGA_STATE_STORE = Symbol('SAGA_STATE_STORE');
