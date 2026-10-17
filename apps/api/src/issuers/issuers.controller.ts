import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { CreateIssuerDto } from './dto/create-issuer.dto.js';
import type { IssuerResponse } from './issuer-response.js';
import { IssuersService } from './issuers.service.js';

// A malformed id cannot match any issuer, so it answers 404 like an unknown one.
const issuerId = new ParseUUIDPipe({ errorHttpStatusCode: 404 });

@Controller('issuers')
@Roles('admin')
export class IssuersController {
  constructor(private readonly issuersService: IssuersService) {}

  @Post()
  @HttpCode(201)
  create(@Body() body: CreateIssuerDto): Promise<IssuerResponse> {
    return this.issuersService.register(body);
  }

  @Get()
  list(): Promise<IssuerResponse[]> {
    return this.issuersService.list();
  }

  @Get(':id')
  get(@Param('id', issuerId) id: string): Promise<IssuerResponse> {
    return this.issuersService.get(id);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(@Param('id', issuerId) id: string): Promise<IssuerResponse> {
    return this.issuersService.revoke(id);
  }
}
