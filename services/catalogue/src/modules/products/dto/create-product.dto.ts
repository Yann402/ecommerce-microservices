import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  nom: string;

  @IsString()
  @MinLength(1)
  description: string;

  // Prix en unités monétaires (ex. 399.00), 2 décimales max.
  // Casté en Decimal128 par Mongoose ; jamais manipulé en flottant côté métier.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  prix: number;

  // Stock initial : entier >= 0.
  @IsInt()
  @Min(0)
  stock: number;

  @IsString()
  categorieId: string;

  // URLs S3 des images (facultatif) : l'upload de fichier n'est pas géré ici,
  // l'admin fournit des URLs déjà hébergées (ADR-10).
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  listeUrlsImages?: string[];
}
