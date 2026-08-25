import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "./prisma/prisma.module";
import { RabbitMQModule } from "./rabbitmq/rabbitmq.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { HealthModule } from "./modules/health/health.module";
import { MetricsModule } from "./observability/metrics.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    PrismaModule,
    RabbitMQModule,
    OrdersModule,
    HealthModule,
    MetricsModule,
  ],
})
export class AppModule {}
