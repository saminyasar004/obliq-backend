import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Task } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async create(taskData: any): Promise<Task> {
    const data = { ...taskData };
    if (data.dueDate && data.dueDate !== '') {
      data.dueDate = new Date(data.dueDate);
    } else {
      delete data.dueDate;
    }

    return this.prisma.task.create({
      data,
    });
  }

  async findAll(assignedTo?: string): Promise<any[]> {
    return this.prisma.task.findMany({
      where: assignedTo ? { assignedTo } : {},
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<any> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(id: string, updateData: any): Promise<Task> {
    await this.findById(id);
    const data = { ...updateData };
    if (data.dueDate && data.dueDate !== '') {
      data.dueDate = new Date(data.dueDate);
    } else if (data.dueDate === '') {
      data.dueDate = null;
    }

    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.task.delete({
      where: { id },
    });
  }
}
