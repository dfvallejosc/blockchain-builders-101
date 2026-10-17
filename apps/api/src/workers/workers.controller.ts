import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { CurrentIssuer, Roles } from '../auth/decorators.js';
import type { Issuer } from '../issuers/issuer.entity.js';
import type { CreateWorkerDto } from './dto/create-worker.dto.js';
import type { ListWorkersQueryDto } from './dto/list-workers-query.dto.js';
import type { WorkerResponse } from './worker-response.js';
import { WorkersService } from './workers.service.js';

@Controller('workers')
@Roles('issuer')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post()
  @HttpCode(201)
  create(
    @CurrentIssuer() issuer: Issuer,
    @Body() body: CreateWorkerDto,
  ): Promise<WorkerResponse> {
    return this.workersService.register(issuer, body);
  }

  @Get()
  list(
    @CurrentIssuer() issuer: Issuer,
    @Query() query: ListWorkersQueryDto,
  ): Promise<WorkerResponse[]> {
    return this.workersService.list(issuer, query);
  }
}
