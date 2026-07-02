import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISagaStateStore } from '../../application/saga/saga-state-store.interface';
import {
  SagaState,
  SagaStatus,
} from '../../application/saga/saga-orchestrator.base';
import { SagaStateEntity } from './saga-state.orm-entity';

/**
 * TypeORM implementation of SAGA state store
 */
@Injectable()
export class TypeOrmSagaStateStore implements ISagaStateStore {
  constructor(
    @InjectRepository(SagaStateEntity, 'write')
    private readonly repository: Repository<SagaStateEntity>,
  ) {}

  async save(state: SagaState): Promise<void> {
    const entity = this.repository.create({
      sagaId: state.sagaId,
      status: state.status,
      currentStep: state.currentStep,
      data: state.data,
      completedSteps: state.completedSteps,
      error: state.error ? JSON.stringify(state.error) : null,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    });
    await this.repository.save(entity);
  }

  async findById(sagaId: string): Promise<SagaState | null> {
    const entity = await this.repository.findOne({
      where: { sagaId },
    });
    if (!entity) {
      return null;
    }
    return this.toSagaState(entity);
  }

  async update(state: SagaState): Promise<void> {
    const entity = await this.repository.findOne({
      where: { sagaId: state.sagaId },
    });
    if (!entity) {
      throw new Error(`SAGA state not found: ${state.sagaId}`);
    }
    entity.status = state.status;
    entity.currentStep = state.currentStep;
    entity.data = state.data;
    entity.completedSteps = state.completedSteps;
    entity.error = state.error ? JSON.stringify(state.error) : null;
    entity.updatedAt = state.updatedAt;
    await this.repository.save(entity);
  }

  private toSagaState(entity: SagaStateEntity): SagaState {
    return {
      sagaId: entity.sagaId,
      status: entity.status as SagaStatus,
      currentStep: entity.currentStep,
      data: entity.data,
      completedSteps: entity.completedSteps,
      error: entity.error ? (JSON.parse(entity.error) as Error) : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
