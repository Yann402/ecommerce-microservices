import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';

// Contexte d'exécution simulé avec un utilisateur d'un rôle donné.
function contextAvecRole(role: string, requiredRoles: string[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;
  const ctx = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as never;
  return { guard: new RolesGuard(reflector), ctx };
}

describe('RolesGuard (autorisation par rôle)', () => {
  it('laisse passer un ADMIN_METIER sur une route admin', () => {
    const { guard, ctx } = contextAvecRole('ADMIN_METIER', ['ADMIN_METIER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('refuse un CLIENT sur une route admin (403)', () => {
    const { guard, ctx } = contextAvecRole('CLIENT', ['ADMIN_METIER']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("laisse passer si la route n'exige aucun rôle", () => {
    const { guard, ctx } = contextAvecRole('CLIENT', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
