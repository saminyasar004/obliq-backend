import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async create(userData: any): Promise<User> {
    return this.prisma.user.create({
      data: userData,
    });
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        extraPermissions: {
          include: {
            permission: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        extraPermissions: {
          include: {
            permission: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(managerId?: string): Promise<any[]> {
    return this.prisma.user.findMany({
      where: managerId ? { managerId } : {},
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, updateData: any): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If password is being updated, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async getManagedUsers(managerId: string): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { managerId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  }

  async grantPermission(userId: string, permissionId: string, grantorId: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException('Permission template not found');
    }

    const grantor = await this.findById(grantorId);
    const grantorPermissions = await this.getUserPermissions(grantorId);
    const isAdmin = grantor?.role?.name === 'ADMIN';

    if (!isAdmin && !grantorPermissions.includes(permission.name)) {
      throw new ForbiddenException(`Grant Ceiling: You cannot grant the permission "${permission.name}" because you do not possess it.`);
    }

    const userPermissions = await this.getUserPermissions(userId);
    if (userPermissions.includes(permission.name)) {
      throw new BadRequestException('Permission already granted to this user (either via role or specifically)');
    }

    await this.prisma.userPermission.create({
      data: {
        userId,
        permissionId,
      },
    });
  }

  async revokePermission(userId: string, permissionId: string): Promise<void> {
    try {
      await this.prisma.userPermission.delete({
        where: {
          userId_permissionId: {
            userId,
            permissionId,
          },
        },
      });
    } catch (error) {
      throw new NotFoundException('Permission not found for this user');
    }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rolePermissions = user.role?.permissions?.map((p: any) => p.permission.name) || [];
    const extraPermissions = user.extraPermissions?.map((p: any) => p.permission.name) || [];
    
    // Combine and remove duplicates
    return [...new Set([...rolePermissions, ...extraPermissions])];
  }

  async canUserAccessResource(userId: string, requiredPermission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(requiredPermission);
  }
}
