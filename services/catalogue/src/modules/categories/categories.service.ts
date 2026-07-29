import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async creer(dto: CreateCategoryDto) {
    try {
      return await new this.categoryModel(dto).save();
    } catch (e: any) {
      // 11000 = violation d'unicité (nom déjà pris).
      if (e?.code === 11000) {
        throw new ConflictException(`La catégorie « ${dto.nom} » existe déjà.`);
      }
      throw e;
    }
  }

  async lister() {
    return this.categoryModel.find().sort({ nom: 1 }).exec();
  }

  // Garde d'intégrité applicative : MongoDB n'a pas de clé étrangère, donc
  // on vérifie explicitement l'existence de la catégorie avant de rattacher
  // un produit. 400 si la catégorie est inconnue.
  async verifierExiste(categorieId: string): Promise<void> {
    const existe = await this.categoryModel.exists({ _id: categorieId });
    if (!existe) {
      throw new BadRequestException(`Catégorie « ${categorieId} » inconnue.`);
    }
  }
}
