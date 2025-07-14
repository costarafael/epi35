import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      console.log('ZodValidationPipe - input value:', JSON.stringify(value, null, 2));
      console.log('ZodValidationPipe - metadata:', _metadata);
      const parsedValue = this.schema.parse(value);
      console.log('ZodValidationPipe - parsed value:', JSON.stringify(parsedValue, null, 2));
      return parsedValue;
    } catch (error) {
      console.log('ZodValidationPipe - validation error:', error);
      const validationError = fromZodError(error);
      throw new BadRequestException(validationError.toString());
    }
  }
}
