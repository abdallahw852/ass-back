import { Injectable } from '@nestjs/common';
import { ISagaStep, SagaContext } from './saga-step.base';

export enum SagaStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  FAILED = 'FAILED',
}

export interface SagaState {
  sagaId: string;
  status: SagaStatus;
  currentStep: number;
  data: Record<string, unknown>;
  completedSteps: number[];
  error?: Error;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base class for SAGA orchestrators
 * Orchestrates distributed transactions across bounded contexts
 */
@Injectable()
export abstract class SagaOrchestratorBase {
  protected abstract steps: ISagaStep[];

  /**
   * Execute the SAGA
   */
  async execute(
    sagaId: string,
    initialData: Record<string, unknown>,
  ): Promise<SagaState> {
    const context: SagaContext = {
      sagaId,
      data: { ...initialData },
      events: [],
    };

    let currentStep = 0;
    const completedSteps: number[] = [];

    try {
      for (let i = 0; i < this.steps.length; i++) {
        currentStep = i;
        await this.steps[i].execute(context);
        completedSteps.push(i);
      }

      return {
        sagaId,
        status: SagaStatus.COMPLETED,
        currentStep: this.steps.length,
        data: context.data,
        completedSteps,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      // Compensate completed steps in reverse order
      await this.compensate(completedSteps, context);
      return {
        sagaId,
        status: SagaStatus.COMPENSATED,
        currentStep,
        data: context.data,
        completedSteps: [],
        error: error as Error,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Compensate completed steps
   */
  private async compensate(
    completedSteps: number[],
    context: SagaContext,
  ): Promise<void> {
    // Compensate in reverse order
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const stepIndex = completedSteps[i];
      try {
        await this.steps[stepIndex].compensate(context);
      } catch (error) {
        // Log compensation error but continue
        console.error(
          `Failed to compensate step ${stepIndex} in SAGA ${context.sagaId}:`,
          error,
        );
      }
    }
  }
}
