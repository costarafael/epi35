import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessError, ValidationError, NotFoundError, ConflictError, UnauthorizedError } from '../../domain/exceptions/business.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;
    let code: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      
      if (typeof responseBody === 'object' && responseBody !== null) {
        message = (responseBody as any).message || message;
        details = (responseBody as any).details;
      } else {
        message = responseBody as string;
      }
    } else if (exception instanceof ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = exception.code;
      details = exception.field ? { field: exception.field } : undefined;
    } else if (exception instanceof NotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof ConflictError) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof UnauthorizedError) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof BusinessError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(code && { code }),
      ...(details && { details }),
    };

    if (status >= 500) {
      console.error('Internal Server Error:', exception);
    }

    response.status(status).json(errorResponse);
  }
}