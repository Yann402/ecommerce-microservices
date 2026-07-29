import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// Tous les champs deviennent optionnels : une mise à jour partielle est permise.
export class UpdateProductDto extends PartialType(CreateProductDto) {}
