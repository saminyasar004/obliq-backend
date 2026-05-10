import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Lead, LeadStatus } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async create(leadData: any): Promise<Lead> {
    return this.prisma.lead.create({
      data: leadData,
    });
  }

  async findAll(assignedTo?: string): Promise<any[]> {
    return this.prisma.lead.findMany({
      where: assignedTo ? { assignedTo } : {},
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<any> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async update(id: string, updateData: any): Promise<Lead> {
    await this.findById(id);
    return this.prisma.lead.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
    await this.findById(id);
    return this.prisma.lead.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.lead.delete({
      where: { id },
    });
  }

  async assignLead(id: string, userId: string): Promise<Lead> {
    await this.findById(id);
    return this.prisma.lead.update({
      where: { id },
      data: { assignedTo: userId },
    });
  }
}
