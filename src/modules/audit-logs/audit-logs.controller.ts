import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions('audit_logs.view')
  @ApiOperation({ summary: 'Get all audit logs with optional filters' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'resource', required: false, description: 'Filter by resource' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results (default 100)' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  findAll(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.auditLogsService.findAll(userId, action, resource, parsedLimit);
  }

  @Get('user/:userId')
  @Permissions('audit_logs.view')
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  @ApiResponse({ status: 200, description: 'User audit logs' })
  findByUser(@Param('userId') userId: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.auditLogsService.findByUser(userId, parsedLimit);
  }

  @Get('action/:action')
  @Permissions('audit_logs.view')
  @ApiOperation({ summary: 'Get audit logs for a specific action' })
  @ApiResponse({ status: 200, description: 'Action audit logs' })
  findByAction(@Param('action') action: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.auditLogsService.findByAction(action, parsedLimit);
  }
}
