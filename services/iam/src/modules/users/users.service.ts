import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Role } from '@prisma/client';

// Accès aux données utilisateur. Le hachage du mot de passe est fait
// dans AuthService à la création — jamais stocké en clair (F-2.1.b).
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return user;
  }

  // Liste tous les utilisateurs (route administrateur).
  async findAll(): Promise<Omit<User, 'motDePasseHache'>[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { dateCreation: 'desc' },
    });
    // On ne renvoie jamais le hachage du mot de passe (champ retire volontairement).
    return users.map((u) => {
      const rest = { ...u };
      delete (rest as Partial<User>).motDePasseHache;
      return rest;
    });
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
