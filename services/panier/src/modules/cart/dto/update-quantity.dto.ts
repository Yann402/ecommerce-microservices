import { IsInt, IsPositive } from 'class-validator';

export class UpdateQuantityDto {
  @IsInt()
  @IsPositive()
  quantite: number;
}
