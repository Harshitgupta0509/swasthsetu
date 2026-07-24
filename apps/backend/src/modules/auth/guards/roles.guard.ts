import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRole } from '../interfaces/auth-user-repository.interface';

export const ROLES_KEY = 'auth:roles';
export const Roles = (...roles: AuthRole[]) => (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) =>
  Reflect.defineMetadata(ROLES_KEY, roles, descriptor?.value ?? target);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<{ user?: { role?: AuthRole } }>();
    return Boolean(request.user?.role && roles.includes(request.user.role));
  }
}
