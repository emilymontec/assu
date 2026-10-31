import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { MerchantJwtPayload } from './jwt-auth.guard';

/** Solo usable detrás de `@UseGuards(JwtAuthGuard)`, que es quien llena `request.merchant`. */
export const CurrentMerchant = createParamDecorator((_: unknown, ctx: ExecutionContext): MerchantJwtPayload => {
  const request = ctx.switchToHttp().getRequest<Request & { merchant: MerchantJwtPayload }>();
  return request.merchant;
});
