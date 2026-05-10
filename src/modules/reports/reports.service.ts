import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserStatus, LeadStatus, TaskStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getOverview() {
    const [totalUsers, totalLeads, totalTasks] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.lead.count(),
      this.prisma.task.count(),
    ]);

    return {
      totalUsers,
      totalLeads,
      totalTasks,
    };
  }

  async getUserStats() {
    const total = await this.prisma.user.count();
    const active = await this.prisma.user.count({ where: { status: UserStatus.ACTIVE } });
    const suspended = await this.prisma.user.count({ where: { status: UserStatus.SUSPENDED } });
    const banned = await this.prisma.user.count({ where: { status: UserStatus.BANNED } });

    return { total, active, suspended, banned };
  }

  async getLeadStats() {
    const total = await this.prisma.lead.count();
    const byStatus = await Promise.all(
      Object.values(LeadStatus).map(async (status) => ({
        status,
        count: await this.prisma.lead.count({ where: { status } }),
      }))
    );

    return { total, byStatus };
  }

  async getTaskStats() {
    const total = await this.prisma.task.count();
    const byStatus = await Promise.all(
      Object.values(TaskStatus).map(async (status) => ({
        status,
        count: await this.prisma.task.count({ where: { status } }),
      }))
    );

    return { total, byStatus };
  }
}
