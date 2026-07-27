import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Préfixe global : toutes les routes sont exposées sous /api/v1 (F-1.2.c)
  app.setGlobalPrefix('api/v1');

  // Validation automatique des DTO entrants (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Service IAM démarré sur http://localhost:${port}/api/v1`);
}
bootstrap();
