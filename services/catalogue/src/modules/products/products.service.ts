import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly categories: CategoriesService,
  ) {}

  // ---------- Lecture publique ----------

  // Liste paginée des produits ACTIFS (US 2.2 / F-2.2.a).
  async lister(query: QueryProductsDto) {
    const { page, taille, categorieId } = query;

    const filtre: FilterQuery<ProductDocument> = { actif: true };
    if (categorieId) filtre.categorieId = categorieId;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filtre)
        .sort({ dateCreation: -1 })
        .skip((page - 1) * taille)
        .limit(taille)
        .exec(),
      this.productModel.countDocuments(filtre).exec(),
    ]);

    return {
      data: items,
      pagination: { page, taille, total, totalPages: Math.ceil(total / taille) },
    };
  }

  // Détail d'un produit actif (F-2.2.b). 404 si absent/soft-deleté.
  async trouverParId(id: string) {
    const produit = await this.productModel
      .findOne({ _id: id, actif: true })
      .exec();
    if (!produit) throw new NotFoundException(`Produit ${id} introuvable.`);
    return produit;
  }

  // ---------- CRUD admin (F-2.2.d) ----------

  async creer(dto: CreateProductDto) {
    // Intégrité applicative : la catégorie doit exister.
    await this.categories.verifierExiste(dto.categorieId);
    return new this.productModel(dto).save();
  }

  async mettreAJour(id: string, dto: UpdateProductDto) {
    if (dto.categorieId) await this.categories.verifierExiste(dto.categorieId);
    const produit = await this.productModel
      .findOneAndUpdate({ _id: id, actif: true }, dto, { new: true })
      .exec();
    if (!produit) throw new NotFoundException(`Produit ${id} introuvable.`);
    return produit;
  }

  // Suppression LOGIQUE : actif -> false. Le document reste en base pour
  // préserver l'intégrité des commandes passées.
  async supprimer(id: string) {
    const produit = await this.productModel
      .findOneAndUpdate({ _id: id, actif: true }, { actif: false }, { new: true })
      .exec();
    if (!produit) throw new NotFoundException(`Produit ${id} introuvable.`);
    return { id, supprime: true };
  }

  // Ré-incrémente le stock : utilisé par la COMPENSATION de la Saga (rollback
  // d'une ligne quand une autre ligne de la même commande est en rupture).
  async incrementerStock(id: string, quantite: number): Promise<void> {
    await this.productModel
      .findOneAndUpdate({ _id: id }, { $inc: { stock: quantite } })
      .exec();
  }

  // ---------- Décrément atomique conditionnel (Bug 1) ----------

  // Utilisé plus tard par la Saga (le Catalogue consommera CommandeCréée au
  // Sprint Commandes). findOneAndUpdate est ATOMIQUE sur un document : la
  // condition « stock >= quantite » et le décrément sont évalués ensemble,
  // empêchant deux commandes concurrentes de faire passer le stock en négatif.
  // Retourne false si le stock est insuffisant -> compensation Saga.
  async decrementerStockConditionnel(
    id: string,
    quantite: number,
  ): Promise<boolean> {
    const res = await this.productModel
      .findOneAndUpdate(
        { _id: id, actif: true, stock: { $gte: quantite } },
        { $inc: { stock: -quantite } },
        { new: true },
      )
      .exec();
    return res !== null;
  }
}
