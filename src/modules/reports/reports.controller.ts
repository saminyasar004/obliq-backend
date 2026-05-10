import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @Permissions('reports.view')
  @ApiOperation({ summary: 'Get system overview report' })
  @ApiResponse({ status: 200, description: 'Overview statistics' })
  getOverview() {
    return this.reportsService.getOverview();
  }

  @Get('users')
  @Permissions('reports.view')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  getUserStats() {
    return this.reportsService.getUserStats();
  }

  @Get('leads')
  @Permissions('reports.view')
  @ApiOperation({ summary: 'Get lead statistics' })
  @ApiResponse({ status: 200, description: 'Lead statistics' })
  getLeadStats() {
    return this.reportsService.getLeadStats();
  }

  @Get('tasks')
  @Permissions('reports.view')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({ status: 200, description: 'Task statistics' })
  getTaskStats() {
    return this.reportsService.getTaskStats();
  }
}
