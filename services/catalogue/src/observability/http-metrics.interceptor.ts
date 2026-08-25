import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

// Mesure la durée de chaque requête HTTP et l'enregistre dans un histogramme,
// étiqueté par méthode, route et code de retour. On utilise le PATRON de route
// (ex. /products/:id) et non l'URL réelle, pour éviter une explosion du nombre
// de séries (chaque identifiant créerait sinon une métrique distincte).
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = Date.now();
    const route = req.route?.path ?? req.url;

    return next.handle().pipe(
      finalize(() => {
        const duration = (Date.now() - start) / 1000;
        this.histogram
          .labels(req.method, route, String(res.statusCode))
          .observe(duration);
      }),
    );
  }
}
