import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
// OpenTelemetry : propagation du contexte de trace à travers RabbitMQ (niveau 2).
import { context, propagation, trace, SpanKind } from '@opentelemetry/api';

type Handler = (content: any, headers: any, routingKey: string) => Promise<void>;

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly exchange = 'ecommerce';
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;
  private ready: Promise<void>;
  private readonly tracer = trace.getTracer('rabbitmq');

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
  // Niveau 2 : on INJECTE aussi le contexte de trace (traceparent) dans les
  // headers, pour que le consommateur rattache son traitement à cette trace.
  async publish(routingKey: string, message: unknown, headers: Record<string, unknown> = {}) {
    await this.ready;

    // Span "producer" autour de la publication (visible dans Jaeger).
    const span = this.tracer.startSpan(`publish ${routingKey}`, {
      kind: SpanKind.PRODUCER,
    });

    // On exécute l'injection DANS le contexte de ce span, pour que le
    // traceparent écrit dans les headers pointe vers lui.
    context.with(trace.setSpan(context.active(), span), () => {
      propagation.inject(context.active(), headers);
    });

    this.channel.publish(this.exchange, routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
      headers,
    });

    span.end();
  }

  async consume(queue: string, bindingKeys: string[], handler: Handler) {
    await this.ready;
    await this.channel.assertQueue(queue, { durable: true });
    for (const key of bindingKeys) await this.channel.bindQueue(queue, this.exchange, key);
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      const headers = msg.properties.headers ?? {};
      // Niveau 2 : on EXTRAIT le contexte de trace depuis les headers du message.
      const parentContext = propagation.extract(context.active(), headers);

      // Span "consumer" rattaché à la trace d'origine (le lien asynchrone).
      const span = this.tracer.startSpan(
        `consume ${msg.fields.routingKey}`,
        { kind: SpanKind.CONSUMER },
        parentContext,
      );
      const spanContext = trace.setSpan(parentContext, span);

      // Tout le traitement s'exécute DANS ce contexte -> les spans créés par le
      // handler (appels DB, HTTP...) se rattachent à la trace d'origine.
      await context.with(spanContext, async () => {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content, headers, msg.fields.routingKey);
          this.channel.ack(msg);
        } catch (e) {
          this.logger.error(`Échec traitement (${queue}) : ${(e as Error).message}`);
          span.recordException(e as Error);
          this.channel.nack(msg, false, false); // pas de requeue -> évite la boucle infinie
        } finally {
          span.end();
        }
      });
    });
    this.logger.log(`Consumer actif : ${queue} <- [${bindingKeys.join(', ')}]`);
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
