import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// Données d'inscription (F-2.1.a). Validées automatiquement par le ValidationPipe.
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  motDePasse: string;
}
