import { Controller, Get } from '@nestjs/common';

export interface HelloResponse {
  name: string;
  message: string;
}

@Controller()
export class AppController {
  @Get()
  getHello(): HelloResponse {
    return { name: 'HabilitApp API', message: 'Hola desde HabilitApp' };
  }
}
