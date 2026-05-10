import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';

async function fixPermissions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    console.log('🛠️ Starting Permission Sync...');

    // 1. Get ADMIN role
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      console.error('❌ ADMIN role not found!');
      return;
    }
    console.log(`✅ Found ADMIN role (ID: ${adminRole.id})`);

    // 2. Get all permissions
    const allPermissions = await prisma.permission.findMany();
    console.log(`✅ Found ${allPermissions.length} total permissions in system`);

    // 3. Link them
    let count = 0;
    for (const perm of allPermissions) {
      const exists = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        },
      });

      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: perm.id
          }
        });
        count++;
      }
    }

    console.log(`🚀 SYNC COMPLETE: Linked ${count} new permissions to ADMIN role.`);
    
    // 4. Verify
    const verifyRole = await prisma.role.findUnique({
      where: { id: adminRole.id },
      include: { permissions: true }
    });
    console.log(`📊 ADMIN now has ${verifyRole?.permissions?.length || 0} permissions.`);

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await app.close();
  }
}

fixPermissions();
