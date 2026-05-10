import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { LeadStatus } from '@prisma/client';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Permissions('leads.view')
  @ApiOperation({ summary: 'Get all leads' })
  @ApiResponse({ status: 200, description: 'List of leads' })
  findAll(@Query('assignedTo') assignedTo?: string) {
    return this.leadsService.findAll(assignedTo);
  }

  @Get(':id')
  @Permissions('leads.view')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead details' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @Post()
  @Permissions('leads.manage')
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created' })
  create(@Body() body: any, @Request() req) {
    return this.leadsService.create({
      ...body,
      createdBy: req.user.userId,
    });
  }

  @Patch(':id')
  @Permissions('leads.manage')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.leadsService.update(id, body);
  }

  @Patch(':id/status')
  @Permissions('leads.manage')
  @ApiOperation({ summary: 'Update lead status' })
  @ApiResponse({ status: 200, description: 'Lead status updated' })
  updateStatus(@Param('id') id: string, @Body('status') status: LeadStatus) {
    return this.leadsService.updateStatus(id, status);
  }

  @Patch(':id/assign')
  @Permissions('leads.manage')
  @ApiOperation({ summary: 'Assign lead to a user' })
  @ApiResponse({ status: 200, description: 'Lead assigned' })
  assignLead(@Param('id') id: string, @Body('userId') userId: string) {
    return this.leadsService.assignLead(id, userId);
  }

  @Delete(':id')
  @Permissions('leads.manage')
  @ApiOperation({ summary: 'Delete a lead' })
  @ApiResponse({ status: 200, description: 'Lead deleted' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  delete(@Param('id') id: string) {
    return this.leadsService.delete(id);
  }
}
