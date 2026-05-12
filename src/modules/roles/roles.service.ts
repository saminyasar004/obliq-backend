import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async findAll(): Promise<any[]> {
    const roles = await this.prisma.role.findMany({ 
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map(role => ({
      ...role,
      permissions: role.permissions.map(p => p.permission),
    }));
  }

  async findOne(id: string): Promise<any | null> {
    const role = await this.prisma.role.findUnique({ 
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      ...role,
      permissions: role.permissions.map(p => p.permission),
    };
  }

  async findByName(name: string): Promise<any | null> {
    const role = await this.prisma.role.findUnique({ 
      where: { name },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      ...role,
      permissions: role.permissions.map(p => p.permission),
    };
  }

  async create(roleData: any): Promise<Role> {
    const existing = await this.prisma.role.findUnique({ where: { name: roleData.name } });
    if (existing) {
      throw new BadRequestException('Role with this name already exists');
    }
    return this.prisma.role.create({
      data: roleData,
    });
  }

  async update(id: string, roleData: any): Promise<Role> {
    const role = await this.findOne(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (roleData.name && roleData.name !== role.name) {
      const existing = await this.prisma.role.findUnique({ where: { name: roleData.name } });
      if (existing) {
        throw new BadRequestException('Role with this name already exists');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: roleData,
    });
  }

  async delete(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.prisma.role.delete({
      where: { id },
    });
  }

  async assignPermission(roleId: string, permissionId: string): Promise<void> {
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    if (existing) {
      throw new BadRequestException('Permission already assigned to this role');
    }

    await this.prisma.rolePermission.create({
      data: { roleId, permissionId },
    });
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    try {
      await this.prisma.rolePermission.delete({ 
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
      });
    } catch (error) {
      throw new NotFoundException('Permission not found for this role');
    }
  }

  async getRolePermissions(roleId: string): Promise<any[]> {
    const role = await this.findOne(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role.permissions.map((p: any) => p.permission) || [];
  }
}
