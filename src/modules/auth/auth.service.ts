import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      if (user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException(`Account is ${user.status}`);
      }
      return user;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      roleId: user.roleId,
      role: user.role?.name,
      permissions: this.extractPermissions(user),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN'),
      },
    );

    // Hash and store refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name,
        roleId: user.roleId,
        permissions: payload.permissions,
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.buildUserResponse(user);
  }

  private buildUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name,
      roleId: user.roleId,
      permissions: this.extractPermissions(user),
    };
  }

  async register(userData: any) {
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Role determination logic
    const userCount = await this.prisma.user.count();
    let role;

    if (userCount === 0) {
      // Force first user to be ADMIN
      role = await this.prisma.role.findUnique({ where: { name: 'ADMIN' } });
      if (!role)
        throw new BadRequestException(
          'ADMIN role not found. Seed the database.',
        );
    } else if (userData.roleId) {
      // Use roleId provided by the requester
      role = await this.prisma.role.findUnique({ where: { id: userData.roleId } });
      if (!role) throw new BadRequestException('Selected role does not exist.');
    } else {
      // Fallback to CUSTOMER if no role specified
      role = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
      if (!role)
        throw new BadRequestException(
          'CUSTOMER role not found. Seed the database.',
        );
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
      roleId: role.id,
      status: UserStatus.ACTIVE,
    });

    const createdUser = await this.usersService.findById(user.id);
    if (!createdUser) {
      throw new BadRequestException('User creation failed');
    }

    return this.login(createdUser);
  }

  async getBootstrapStatus() {
    const userCount = await this.prisma.user.count();
    return { isBootstrapped: userCount > 0 };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { password, ...userWithoutPassword } = user;
    return this.login(userWithoutPassword);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  private extractPermissions(user: any): string[] {
    const rolePermissions =
      user.role?.permissions?.map((p: any) => p.permission?.name) || [];
    const extraPermissions =
      user.extraPermissions?.map((p: any) => p.permission?.name) || [];
    // Combine and remove duplicates
    return rolePermissions
      .concat(extraPermissions)
      .filter(
        (permission, index, list) =>
          permission && list.indexOf(permission) === index,
      );
  }
}
