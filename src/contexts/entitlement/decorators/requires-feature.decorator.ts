import { SetMetadata } from '@nestjs/common';

export const REQUIRES_FEATURE_KEY = 'requiresFeature';

export const RequiresFeature = (
  key: string,
): MethodDecorator & ClassDecorator => SetMetadata(REQUIRES_FEATURE_KEY, key);
