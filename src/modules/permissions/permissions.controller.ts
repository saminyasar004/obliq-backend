import { Controller, Get, Post, Delete, Body, Param, UseGuards, Patch, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('permissions.view')
  @ApiOperation({ summary: 'List all permission atoms' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Permissions('permissions.view')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiResponse({ status: 200, description: 'Permission details' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Post()
  @Permissions('permissions.manage')
  @ApiOperation({ summary: 'Create a new permission atom' })
  @ApiResponse({ status: 201, description: 'Permission created' })
  @ApiResponse({ status: 400, description: 'Permission already exists' })
  create(@Body() body: { name: string; description?: string }) {
    return this.permissionsService.create(body);
  }

  @Patch(':id')
  @Permissions('permissions.manage')
  @ApiOperation({ summary: 'Update a permission' })
  @ApiResponse({ status: 200, description: 'Permission updated' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string }
  ) {
    return this.permissionsService.update(id, body);
  }

  @Delete(':id')
  @Permissions('permissions.manage')
  @ApiOperation({ summary: 'Delete a permission' })
  @ApiResponse({ status: 200, description: 'Permission deleted' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }

  @Post('users/:userId/grant/:permissionId')
  @HttpCode(201)
  @Permissions('permissions.manage')
  @ApiOperation({ summary: 'Grant a specific permission to a user (override)' })
  @ApiResponse({ status: 201, description: 'Permission granted to user' })
  @ApiResponse({ status: 400, description: 'Permission already granted' })
  grantToUser(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.permissionsService.grantToUser(userId, permissionId);
  }

  @Delete('users/:userId/revoke/:permissionId')
  @Permissions('permissions.manage')
  @ApiOperation({ summary: 'Revoke a specific permission from a user' })
  @ApiResponse({ status: 200, description: 'Permission revoked from user' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  revokeFromUser(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.permissionsService.revokeFromUser(userId, permissionId);
  }
}
