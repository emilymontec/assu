import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface MerchantJwtPayload {
  sub: string; // merchantId
  email: string;
}

/**
 * Protege los endpoints del Portal de Comercios (contrasta con
 * ApiKeyGuard, que protege la Internal API servicio-a-servicio/admin).
 * Cada comercio tiene su propia sesión — nunca una sola API key
 * compartida — por eso esto valida un JWT por request, no una cabecera
 * estática.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { merchant?: MerchantJwtPayload }>();
    const authHeader = request.header('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

    if (!token) {
      throw new UnauthorizedException('Falta el token de sesión (Authorization: Bearer <token>)');
    }

    try {
      request.merchant = await this.jwtService.verifyAsync<MerchantJwtPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token de sesión inválido o expirado');
    }
  }
}
