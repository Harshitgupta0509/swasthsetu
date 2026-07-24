import { Global, Module } from '@nestjs/common';
import { AUTH_USER_REPOSITORY } from '../modules/auth/interfaces/auth-user-repository.interface';
import { PrismaAuthUserRepository } from './prisma-auth-user.repository';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService, PrismaAuthUserRepository, { provide: AUTH_USER_REPOSITORY, useExisting: PrismaAuthUserRepository }], exports: [PrismaService, AUTH_USER_REPOSITORY] })
export class DatabaseModule {}
