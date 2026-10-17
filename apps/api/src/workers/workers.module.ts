import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from './worker.entity.js';
import { WorkersController } from './workers.controller.js';
import { WorkersService } from './workers.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Worker])],
  controllers: [WorkersController],
  providers: [WorkersService],
})
export class WorkersModule {}
