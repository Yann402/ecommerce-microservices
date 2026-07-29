import { SetMetadata } from '@nestjs/common';

// Decorateur pour restreindre une route a certains roles.
// Exemple : @Roles('ADMIN_METIER')
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
