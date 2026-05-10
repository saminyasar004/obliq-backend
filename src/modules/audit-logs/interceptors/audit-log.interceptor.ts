import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from '../audit-logs.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = request;

    // Only log write actions (POST, PATCH, DELETE)
    if (['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(() => {
          this.auditLogsService.log({
            userId: user?.userId,
            action: `${method} ${url}`,
            resource: url.split('/')[1],
            details: { body },
            ipAddress: ip,
          });
        }),
      );
    }

    return next.handle();
  }
}
