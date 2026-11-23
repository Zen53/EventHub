import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module.js';
import { DatabaseModule } from './core/database/index.js';
import { AuthModule } from './modules/auth/index.js';
import { EventsModule } from './modules/events/index.js';
import { UsersModule } from './modules/users/index.js';

@Module({
  imports: [CoreModule, DatabaseModule, UsersModule, AuthModule, EventsModule],
})
export class AppModule {}
