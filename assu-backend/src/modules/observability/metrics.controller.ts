import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * `GET /metrics` NO usa `ApiKeyGuard` a propósito: Prometheus scrapea
 * este endpoint sin enviar headers de negocio, y es el propio scrape
 * config (o una red interna/VPN) el que debe restringir quién llega
 * hasta acá — igual que expone cualquier exporter estándar de
 * Prometheus. Se excluye de Swagger porque no es parte de la API de
 * negocio del Assu.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async getMetrics(@Res() res: Response): Promise<void> {
    res.set('Content-Type', this.metricsService.getContentType());
    res.send(await this.metricsService.getMetrics());
  }
}
