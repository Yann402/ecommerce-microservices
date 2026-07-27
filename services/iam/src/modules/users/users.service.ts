import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Role } from '@prisma/client';

// Accès aux données utilisateur. Le hachage du mot de passe est fait ici,
// à la création — jamais stocké en clair (F-2.1.b).
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: {
    nom: string;
    email: string;
    motDePasseHache: string;
    role?: Role;
  }): Promise<User> {
    const existant = await this.findByEmail(data.email);
    if (existant) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }
    return this.prisma.user.create({ data });
  }
}
