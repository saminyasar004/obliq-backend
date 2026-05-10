import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    console.log('🌱 Starting database seed...');

    // Create Permissions
    console.log('Creating permissions...');
    const permissions = [
      // Dashboard
      { name: 'dashboard.view', description: 'View dashboard' },
      
      // Users
      { name: 'users.view', description: 'View users' },
      { name: 'users.create', description: 'Create users' },
      { name: 'users.edit', description: 'Edit users' },
      { name: 'users.delete', description: 'Delete users' },
      
      // Roles
      { name: 'roles.view', description: 'View roles' },
      { name: 'roles.manage', description: 'Manage roles' },
      
      // Permissions
      { name: 'permissions.view', description: 'View permissions' },
      { name: 'permissions.manage', description: 'Manage permissions' },
      
      // Leads
      { name: 'leads.view', description: 'View leads' },
      { name: 'leads.manage', description: 'Manage leads' },
      
      // Tasks
      { name: 'tasks.view', description: 'View tasks' },
      { name: 'tasks.manage', description: 'Manage tasks' },
      
      // Reports
      { name: 'reports.view', description: 'View reports' },
      
      // Audit Logs
      { name: 'audit_logs.view', description: 'View audit logs' },
    ];

    const createdPermissions: any[] = [];
    for (const perm of permissions) {
      const existing = await prisma.permission.findUnique({ where: { name: perm.name } });
      if (existing) {
        createdPermissions.push(existing);
      } else {
        const created = await prisma.permission.create({ data: perm });
        createdPermissions.push(created);
      }
    }
    console.log(`✅ Created ${createdPermissions.length} permissions`);

    // Create Roles
    console.log('Creating roles...');
    const rolesData = [
      { name: 'ADMIN', description: 'Full system access' },
      { name: 'MANAGER', description: 'Manage team and resources' },
      { name: 'AGENT', description: 'Handle assigned tasks and leads' },
      { name: 'CUSTOMER', description: 'Customer portal access' },
    ];

    const createdRoles: any[] = [];
    for (const roleData of rolesData) {
      const existing = await prisma.role.findUnique({ where: { name: roleData.name } });
      if (existing) {
        createdRoles.push(existing);
      } else {
        const created = await prisma.role.create({ data: roleData });
        createdRoles.push(created);
      }
    }
    console.log(`✅ Created ${createdRoles.length} roles`);

    // Assign permissions to roles
    console.log('Assigning permissions to roles...');
    
    // ADMIN - all permissions
    const adminRole = createdRoles.find(r => r.name === 'ADMIN');
    if (!adminRole) throw new Error('ADMIN role not found after creation');

    for (const perm of createdPermissions) {
      const exists = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id }
        }
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: perm.id,
          }
        });
      }
    }
    console.log('✅ ADMIN permissions assigned');

    // MANAGER - most permissions except permission management
    const managerRole = createdRoles.find(r => r.name === 'MANAGER');
    if (!managerRole) throw new Error('MANAGER role not found after creation');

    const managerPermissions = createdPermissions.filter(p => 
      !p.name.startsWith('permissions.manage') &&
      !p.name.includes('delete')
    );
    for (const perm of managerPermissions) {
      const exists = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id }
        }
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: managerRole.id,
            permissionId: perm.id,
          }
        });
      }
    }
    console.log('✅ MANAGER permissions assigned');

    // AGENT - limited permissions
    const agentRole = createdRoles.find(r => r.name === 'AGENT');
    if (!agentRole) throw new Error('AGENT role not found after creation');

    const agentPermissions = createdPermissions.filter(p => 
      p.name === 'dashboard.view' ||
      p.name === 'leads.view' ||
      p.name === 'tasks.view' ||
      p.name === 'tasks.manage'
    );
    for (const perm of agentPermissions) {
      const exists = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: agentRole.id, permissionId: perm.id }
        }
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: agentRole.id,
            permissionId: perm.id,
          }
        });
      }
    }
    console.log('✅ AGENT permissions assigned');

    // CUSTOMER - minimal permissions
    const customerRole = createdRoles.find(r => r.name === 'CUSTOMER');
    if (!customerRole) throw new Error('CUSTOMER role not found after creation');

    const customerPermissions = createdPermissions.filter(p => 
      p.name === 'dashboard.view'
    );
    for (const perm of customerPermissions) {
      const exists = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: customerRole.id, permissionId: perm.id }
        }
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: customerRole.id,
            permissionId: perm.id,
          }
        });
      }
    }
    console.log('✅ CUSTOMER permissions assigned');

    // Create default admin user
    console.log('Creating default admin user...');
    const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123456', 10);
      await prisma.user.create({
        data: {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          password: hashedPassword,
          roleId: adminRole.id,
          status: 'ACTIVE',
        }
      });
      console.log('✅ Default admin user created');
      console.log('   Email: admin@example.com');
      console.log('   Password: admin123456');
    } else {
      console.log('⚠️  Admin user already exists');
    }

    console.log('\n🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seed();
