import { IsInt, IsPositive, IsString, IsNotEmpty } from 'class-validator';

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @IsPositive()
  quantite: number;
}
