import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { PermanentError } from '../errors/permanent.error';
import { TransientError } from '../errors/transient.error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errorType } = this.resolve(exception);

    this.logger.error({
      path: request.url,
      method: request.method,
      errorType,
      message,
    });

    response.status(status).json({
      statusCode: status,
      errorType,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): { status: number; message: string; errorType: string } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: exception.message,
        errorType: 'HTTP_EXCEPTION',
      };
    }

    if (exception instanceof PermanentError) {
      return { status: HttpStatus.UNPROCESSABLE_ENTITY, message: exception.message, errorType: exception.name };
    }

    if (exception instanceof TransientError) {
      return { status: HttpStatus.SERVICE_UNAVAILABLE, message: exception.message, errorType: exception.name };
    }

    const message = exception instanceof Error ? exception.message : 'Error interno no controlado';
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message, errorType: 'UNKNOWN_ERROR' };
  }
}
