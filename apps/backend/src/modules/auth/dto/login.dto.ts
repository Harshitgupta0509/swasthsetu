import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
