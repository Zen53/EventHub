import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module.js';
import { DatabaseModule } from './core/database/index.js';

@Module({
  imports: [CoreModule, DatabaseModule],
})
export class AppModule {}
