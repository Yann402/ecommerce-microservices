import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extrait l'identifiant utilisateur depuis le JWT validé (claim `sub`).
export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.sub;
});
