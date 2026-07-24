import { Type } from 'class-transformer';
import { IsDate, IsIn, IsMobilePhone, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterPatientDto {
  @IsMobilePhone('en-IN')
  mobileNumber!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @Type(() => Date)
  @IsDate()
  dateOfBirth!: Date;

  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender!: 'MALE' | 'FEMALE' | 'OTHER';

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsMobilePhone('en-IN')
  emergencyContact!: string;
}
