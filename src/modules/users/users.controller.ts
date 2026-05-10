import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UserStatus } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users.view')
  @ApiOperation({ summary: 'Get all users (optionally filtered by manager)' })
  @ApiQuery({ name: 'managerId', required: false, description: 'Filter by manager ID' })
  @ApiResponse({ status: 200, description: 'List of users returned' })
  findAll(@Query('managerId') managerId?: string) {
    return this.usersService.findAll(managerId);
  }

  @Get('managed/me')
  @Permissions('users.view')
  @ApiOperation({ summary: 'Get users managed by current user' })
  @ApiResponse({ status: 200, description: 'List of managed users' })
  getManagedUsers(@Request() req) {
    return this.usersService.getManagedUsers(req.user.userId);
  }

  @Get(':id')
  @Permissions('users.view')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get(':id/permissions')
  @Permissions('users.view')
  @ApiOperation({ summary: 'Get all permissions for a user' })
  @ApiResponse({ status: 200, description: 'User permissions list' })
  getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }

  @Post(':id/permissions/:permissionId')
  @Permissions('users.edit')
  @ApiOperation({ summary: 'Grant a specific permission to user' })
  @ApiResponse({ status: 201, description: 'Permission granted' })
  @ApiResponse({ status: 400, description: 'Permission already granted' })
  grantPermission(
    @Param('id') userId: string,
    @Param('permissionId') permissionId: string,
    @Request() req
  ) {
    return this.usersService.grantPermission(userId, permissionId, req.user.userId);
  }

  @Delete(':id/permissions/:permissionId')
  @Permissions('users.edit')
  @ApiOperation({ summary: 'Revoke a specific permission from user' })
  @ApiResponse({ status: 200, description: 'Permission revoked' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  revokePermission(
    @Param('id') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.usersService.revokePermission(userId, permissionId);
  }

  @Patch(':id')
  @Permissions('users.edit')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.usersService.update(id, updateData);
  }

  @Patch(':id/status')
  @Permissions('users.edit')
  @ApiOperation({ summary: 'Update user status (ACTIVE/SUSPENDED/BANNED)' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ) {
    return this.usersService.updateStatus(id, status);
  }

  @Delete(':id')
  @Permissions('users.delete')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
