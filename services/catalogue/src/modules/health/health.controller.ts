import { Controller, Get } from '@nestjs/common';

// Sonde de santé consommée par les probes Kubernetes (liveness/readiness).
// Répond 200 sans toucher la base : vérifie que le process répond.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
