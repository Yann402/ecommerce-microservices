import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MinLength(1)
  nom: string;

  @IsOptional() @IsString()
  description?: string;
}
