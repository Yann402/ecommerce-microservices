import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

type Handler = (content: any, headers: any, routingKey: string) => Promise<void>;

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly exchange = 'ecommerce';
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;
  private ready: Promise<void>;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.ready = this.connect();
    await this.ready;
  }

  private async connect() {
    const url = this.config.get<string>('RABBITMQ_URL') ?? 'amqp://localhost:5672';
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    this.logger.log('RabbitMQ connecté — exchange "ecommerce" prêt');
  }

  // Publie un événement. Bug 3 : userId + traceId voyagent dans les HEADERS.
  async publish(routingKey: string, message: unknown, headers: Record<string, unknown> = {}) {
    await this.ready;
    this.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true, contentType: 'application/json', headers },
    );
  }

  async consume(queue: string, bindingKeys: string[], handler: Handler) {
    await this.ready;
    await this.channel.assertQueue(queue, { durable: true });
    for (const key of bindingKeys) await this.channel.bindQueue(queue, this.exchange, key);
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content, msg.properties.headers ?? {}, msg.fields.routingKey);
        this.channel.ack(msg);
      } catch (e) {
        this.logger.error(`Échec traitement (${queue}) : ${(e as Error).message}`);
        this.channel.nack(msg, false, false); // pas de requeue -> évite la boucle infinie
      }
    });
    this.logger.log(`Consumer actif : ${queue} <- [${bindingKeys.join(', ')}]`);
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
