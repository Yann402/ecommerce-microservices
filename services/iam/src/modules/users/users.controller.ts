import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// Payload JWT attaché à la requête par le JwtAuthGuard.
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // GET /api/v1/users/me — profil de l'utilisateur connecté.
  // Protégée : nécessite un JWT valide (n'importe quel rôle).
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const payload = (req as Request & { user: JwtPayload }).user;
    const user = await this.users.findById(payload.sub);
    // On expose le profil sans le hachage du mot de passe.
    const profil = { ...user };
    delete (profil as Partial<typeof user>).motDePasseHache;
    return profil;
  }

  // GET /api/v1/users — liste de tous les utilisateurs.
  // Protégée ET réservée au rôle ADMIN_METIER (autorisation par rôle).
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_METIER')
  async findAll() {
    return this.users.findAll();
  }
}
