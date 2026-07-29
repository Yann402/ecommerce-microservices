import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { Product } from './schemas/product.schema';
import { CategoriesService } from '../categories/categories.service';

// Mock chaînable pour reproduire find().sort().skip().limit().exec()
const execChain = (result: any) => {
  const c: any = {};
  c.sort = jest.fn(() => c);
  c.skip = jest.fn(() => c);
  c.limit = jest.fn(() => c);
  c.exec = jest.fn(() => Promise.resolve(result));
  return c;
};

describe('ProductsService', () => {
  let service: ProductsService;
  let model: any;
  const categories = { verifierExiste: jest.fn() };

  beforeEach(async () => {
    model = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: model },
        { provide: CategoriesService, useValue: categories },
      ],
    }).compile();
    service = moduleRef.get(ProductsService);
    jest.clearAllMocks();
  });

  it('lister : renvoie data + pagination correctement calculée', async () => {
    model.find.mockReturnValue(execChain([{ nom: 'A' }, { nom: 'B' }]));
    model.countDocuments.mockReturnValue(execChain(42));

    const res = await service.lister({ page: 2, taille: 20 } as any);

    expect(res.data).toHaveLength(2);
    expect(res.pagination).toEqual({ page: 2, taille: 20, total: 42, totalPages: 3 });
  });

  it('trouverParId : lève 404 quand le produit est absent/soft-deleté', async () => {
    model.findOne.mockReturnValue(execChain(null));
    await expect(service.trouverParId('inexistant')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('décrément atomique : true quand le stock est suffisant', async () => {
    model.findOneAndUpdate.mockReturnValue(execChain({ _id: 'p1', stock: 5 }));
    await expect(
      service.decrementerStockConditionnel('p1', 3),
    ).resolves.toBe(true);
  });

  it('décrément atomique : false quand le stock est insuffisant (Bug 1)', async () => {
    // La condition stock>=quantite n'est pas satisfaite -> findOneAndUpdate
    // ne modifie rien et renvoie null -> pas de stock négatif.
    model.findOneAndUpdate.mockReturnValue(execChain(null));
    await expect(
      service.decrementerStockConditionnel('p1', 999),
    ).resolves.toBe(false);
  });
});
