import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '6b8b4567-8c91-4a9f-9a20-2eb8a7c91b5d' })
  declare id: string;

  @ApiProperty({ example: 'admin@example.com' })
  declare email: string;

  @ApiProperty({ example: 'John' })
  declare firstName: string;

  @ApiProperty({ example: 'Doe' })
  declare lastName: string;

  @ApiProperty({ example: 'ADMIN' })
  declare role: string;

  @ApiProperty({ example: '7d7d7d7d-7d7d-7d7d-7d7d-7d7d7d7d7d7d' })
  declare roleId: string;

  @ApiProperty({ type: [String], example: ['READ_USERS', 'WRITE_USERS'] })
  declare permissions: string[];
}
