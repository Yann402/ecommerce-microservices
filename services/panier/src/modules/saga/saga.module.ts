import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { CartConsumer } from './cart.consumer';

@Module({ imports: [CartModule], providers: [CartConsumer] })
export class SagaModule {}
