import { Module } from '@nestjs/common';
import { PasswordHasher } from './password-hasher.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersRepository, PasswordHasher, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
