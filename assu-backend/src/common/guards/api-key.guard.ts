import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.header('x-api-key');
    const expectedKey = this.configService.get<string>('security.internalApiKey');

    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('API key inválida o ausente');
    }

    return true;
  }
}
