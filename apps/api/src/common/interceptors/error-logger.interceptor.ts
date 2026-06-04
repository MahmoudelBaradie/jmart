import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, HttpException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ErrorLogger');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      catchError((error) => {
        if (!(error instanceof HttpException) || error.getStatus() >= 500) {
          this.logger.error(
            `${req.method} ${req.url} — ${error.message}`,
            error.stack,
          );
        }
        return throwError(() => error);
      }),
    );
  }
}
