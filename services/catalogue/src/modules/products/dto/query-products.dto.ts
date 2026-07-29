import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Paramètres de la liste paginée (US 2.2 / F-2.2.a).
// La pagination est de type "offset" : page + taille, conforme au
// diagramme de classes (lister(page, taille)).
export class QueryProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Taille bornée à 100 : empêche un client de demander une page géante
  // (protection basique contre la surcharge).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  taille: number = 20;

  // Filtre optionnel par catégorie — exploite l'index (categorieId, actif).
  @IsOptional()
  @IsString()
  categorieId?: string;
}
