import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Permissions('tasks.view')
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findAll(@Query('assignedTo') assignedTo?: string) {
    return this.tasksService.findAll(assignedTo);
  }

  @Get(':id')
  @Permissions('tasks.view')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Post()
  @Permissions('tasks.manage')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  create(@Body() body: any, @Request() req) {
    return this.tasksService.create({ ...body, createdBy: req.user.userId });
  }

  @Patch(':id')
  @Permissions('tasks.manage')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.tasksService.update(id, body);
  }

  @Delete(':id')
  @Permissions('tasks.manage')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}
