import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

// Logique d'authentification : inscription (hachage bcrypt) et login (JWT).
// Correspond au diagramme de séquence « Authentification ».
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  // Inscription : hache le mot de passe avant stockage (F-2.1.b).
  async register(dto: RegisterDto) {
    const motDePasseHache = await bcrypt.hash(dto.motDePasse, SALT_ROUNDS);
    const user = await this.users.create({
      nom: dto.nom,
      email: dto.email,
      motDePasseHache,
    });
    return { id: user.id, nom: user.nom, email: user.email, role: user.role };
  }

  // Login : vérifie les identifiants et retourne un JWT signé (F-2.1.c).
  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.actif) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    const valide = await bcrypt.compare(dto.motDePasse, user.motDePasseHache);
    if (!valide) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    // Le JWT porte l'identité et le rôle : Kong le validera ensuite sans rappeler IAM.
    // Le claim 'iss' (issuer) permet a Kong de retrouver le bon secret de verification.
    const payload = { sub: user.id, email: user.email, role: user.role, iss: 'iam-service' };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, tokenType: 'Bearer' };
  }
}
