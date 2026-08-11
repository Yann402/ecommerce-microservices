import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from './redis/redis.module';
import { CartModule } from './modules/cart/cart.module';
import { HealthModule } from './modules/health/health.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { SagaModule } from './modules/saga/saga.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }), // pour JwtAuthGuard
    RedisModule,
    CartModule,
    HealthModule,
    RabbitMQModule,
    SagaModule,
  ],
})
export class AppModule {}
