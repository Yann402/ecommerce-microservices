import './observability/tracing';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Toutes les routes sont préfixées par /api/v1 (aligné sur le routage Kong).
  app.setGlobalPrefix('api/v1');

  // Validation automatique des DTO à l'entrée :
  //  - whitelist  : retire les champs non déclarés dans le DTO
  //  - forbidNonWhitelisted : rejette (400) toute propriété inconnue
  //  - transform  : convertit les types (ex. query string "10" -> number)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Catalogue service à l'écoute sur le port ${port}`);
}
bootstrap();
