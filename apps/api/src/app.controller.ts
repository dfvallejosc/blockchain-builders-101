import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators.js';

export interface HelloResponse {
  name: string;
  message: string;
}

@Controller()
export class AppController {
  @Public()
  @Get()
  getHello(): HelloResponse {
    return { name: 'HabilitApp API', message: 'Hola desde HabilitApp' };
  }
}
