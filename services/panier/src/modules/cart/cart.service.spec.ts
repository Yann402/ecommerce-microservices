import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CartService } from './cart.service';
import { RedisService } from '../../redis/redis.service';
import { CatalogueClient } from '../catalogue/catalogue.client';

describe('CartService', () => {
  let service: CartService;
  let store: Record<string, string>;

  const client = {
    get: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
    set: jest.fn((k: string, v: string) => {
      store[k] = v;
      return Promise.resolve('OK');
    }),
    del: jest.fn((k: string) => {
      delete store[k];
      return Promise.resolve(1);
    }),
  };
  const redis = { getClient: () => client };
  const catalogue = { getProduct: jest.fn() };

  beforeEach(async () => {
    store = {};
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: RedisService, useValue: redis },
        { provide: CatalogueClient, useValue: catalogue },
        { provide: ConfigService, useValue: { get: () => 604800 } },
      ],
    }).compile();
    service = mod.get(CartService);
  });

  it('panier vide par défaut (total 0.00)', async () => {
    const c = await service.getCart('u1');
    expect(c.items).toEqual([]);
    expect(c.total).toBe('0.00');
    expect(c.nombreArticles).toBe(0);
  });

  it('addItem : capture le snapshot et calcule le total en centimes', async () => {
    catalogue.getProduct.mockResolvedValue({ id: 'p1', nom: 'Galaxy', prix: '399.00', stock: 10 });
    const c = await service.addItem('u1', 'p1', 2);
    expect(c.items).toHaveLength(1);
    expect(c.items[0].nomProduit).toBe('Galaxy');
    expect(c.total).toBe('798.00');
    expect(c.nombreArticles).toBe(2);
  });

  it('addItem : fail-open quand le stock est insuffisant (ajout quand même)', async () => {
    catalogue.getProduct.mockResolvedValue({ id: 'p1', nom: 'Galaxy', prix: '399.00', stock: 1 });
    const c = await service.addItem('u1', 'p1', 5);
    expect(c.items[0].disponibiliteAConfirmer).toBe(true);
    expect(c.items[0].quantite).toBe(5);
  });

  it('addItem : produit inexistant -> 404', async () => {
    catalogue.getProduct.mockResolvedValue(null);
    await expect(service.addItem('u1', 'x', 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removeItem : article absent -> 404', async () => {
    await expect(service.removeItem('u1', 'absent')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('clearCart : vide le panier et supprime la clé Redis', async () => {
    catalogue.getProduct.mockResolvedValue({ id: 'p1', nom: 'X', prix: '10.00', stock: 5 });
    await service.addItem('u1', 'p1', 1);
    const c = await service.clearCart('u1');
    expect(c.items).toEqual([]);
    expect(client.del).toHaveBeenCalled();
  });
});
