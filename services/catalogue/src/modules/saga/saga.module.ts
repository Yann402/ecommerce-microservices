import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { StockConsumer } from './stock.consumer';

@Module({ imports: [ProductsModule], providers: [StockConsumer] })
export class SagaModule {}
