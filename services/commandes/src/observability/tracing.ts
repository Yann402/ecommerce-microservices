// Initialisation d'OpenTelemetry. CE FICHIER DOIT ÊTRE IMPORTÉ EN TOUT PREMIER
// dans main.ts (avant NestFactory et tout le reste), pour que l'instrumentation
// automatique s'installe avant le chargement des modules HTTP.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  // Le nom du service (OTEL_SERVICE_NAME) et l'adresse de Jaeger
  // (OTEL_EXPORTER_OTLP_ENDPOINT) viennent des variables d'environnement.
  serviceName: process.env.OTEL_SERVICE_NAME,
  traceExporter: new OTLPTraceExporter(), // lit OTEL_EXPORTER_OTLP_ENDPOINT + /v1/traces
  instrumentations: [
    getNodeAutoInstrumentations({
      // On coupe l'instrumentation du système de fichiers (trop bruyante).
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Vidage propre des traces à l'arrêt du conteneur.
process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
