import { UsePipes } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

export function ZodValidation(schema: ZodSchema) {
  return UsePipes(new ZodValidationPipe(schema));
}