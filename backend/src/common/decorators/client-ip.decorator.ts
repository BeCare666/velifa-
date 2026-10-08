import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.socket.remoteAddress ?? '0.0.0.0';
  },
);
