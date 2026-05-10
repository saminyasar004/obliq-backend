import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getDashboardData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const myLeads = await this.prisma.lead.count({ where: { assignedTo: userId } });
    const myTasks = await this.prisma.task.count({ where: { assignedTo: userId } });

    const dashboardData: any = {
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role?.name,
      },
      myLeads,
      myTasks,
    };

    return dashboardData;
  }
}
