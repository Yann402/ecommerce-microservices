import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Tests du cœur d'authentification. Les dépendances (Users, JWT) sont simulées.
describe('AuthService', () => {
  let auth: AuthService;
  let users: { findByEmail: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    users = { findByEmail: jest.fn(), create: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('jwt.token.fake') },
        },
      ],
    }).compile();
    auth = moduleRef.get(AuthService);
  });

  it("hache le mot de passe à l'inscription (jamais en clair)", async () => {
    users.create.mockImplementation(async (d) => ({ id: 'u1', role: 'CLIENT', ...d }));
    await auth.register({ nom: 'Karim', email: 'k@test.com', motDePasse: 'motdepasse123' });
    const stocke = users.create.mock.calls[0][0].motDePasseHache;
    expect(stocke).not.toBe('motdepasse123'); // le mot de passe n'est pas stocké en clair
    expect(await bcrypt.compare('motdepasse123', stocke)).toBe(true); // mais reste vérifiable
  });

  it('retourne un JWT quand les identifiants sont valides', async () => {
    const hash = await bcrypt.hash('motdepasse123', 10);
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'k@test.com',
      role: 'CLIENT',
      actif: true,
      motDePasseHache: hash,
    });
    const res = await auth.login({ email: 'k@test.com', motDePasse: 'motdepasse123' });
    expect(res.accessToken).toBeDefined();
    expect(res.tokenType).toBe('Bearer');
  });

  it('rejette (401) quand le mot de passe est faux', async () => {
    const hash = await bcrypt.hash('lebon', 10);
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'k@test.com',
      role: 'CLIENT',
      actif: true,
      motDePasseHache: hash,
    });
    await expect(auth.login({ email: 'k@test.com', motDePasse: 'lemauvais' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
