import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthResponse {
  status: 'ok';
  database: 'up';
}

@Controller('health')
export class HealthController {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('El servicio no está disponible.');
    }
    return { status: 'ok', database: 'up' };
  }
}
