import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLog } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async log(data: any): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data,
    });
  }

  async findAll(
    userId?: string,
    action?: string,
    resource?: string,
    limit: number = 100
  ): Promise<any[]> {
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (action) {
      where.action = action;
    }
    
    if (resource) {
      where.resource = resource;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findByUser(userId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findByAction(action: string, limit: number = 50): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }
}
