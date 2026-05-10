import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsUUID,
  IsString,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsNotEmpty()
  @IsString()
  declare firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsNotEmpty()
  @IsString()
  declare lastName: string;

  @ApiProperty({ example: 'admin@example.com', description: 'Email address' })
  @IsEmail()
  declare email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 6 characters)',
  })
  @IsNotEmpty()
  @MinLength(6)
  declare password: string;

  @ApiProperty({
    example: '7d7d7d7d-7d7d-7d7d-7d7d-7d7d7d7d7d7d',
    description: 'Role ID (optional, defaults to customer role)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({
    example: '7d7d7d7d-7d7d-7d7d-7d7d-7d7d7d7d7d7d',
    description: 'Manager ID (for agent/customer hierarchy)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
