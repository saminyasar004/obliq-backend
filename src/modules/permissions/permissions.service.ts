import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Permission } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { name } });
  }

  async create(data: any): Promise<Permission> {
    const existing = await this.prisma.permission.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new BadRequestException('Permission with this name already exists');
    }
    return this.prisma.permission.create({ data });
  }

  async update(id: string, data: any): Promise<Permission> {
    const permission = await this.findOne(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    if (data.name && data.name !== permission.name) {
      const existing = await this.prisma.permission.findUnique({ where: { name: data.name } });
      if (existing) {
        throw new BadRequestException('Permission with this name already exists');
      }
    }

    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    const permission = await this.findOne(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.prisma.permission.delete({ where: { id } });
  }

  async grantToUser(userId: string, permissionId: string): Promise<void> {
    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: { userId, permissionId },
      },
    });

    if (existing) {
      throw new BadRequestException('Permission already granted to user');
    }

    await this.prisma.userPermission.create({
      data: { userId, permissionId },
    });
  }

  async revokeFromUser(userId: string, permissionId: string): Promise<void> {
    try {
      await this.prisma.userPermission.delete({ 
        where: {
          userId_permissionId: { userId, permissionId },
        },
      });
    } catch (error) {
      throw new NotFoundException('Permission not found for this user');
    }
  }
}
