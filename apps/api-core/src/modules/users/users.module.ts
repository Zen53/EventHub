import { Module } from '@nestjs/common';
import { PasswordHasher } from './password-hasher.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  providers: [UsersRepository, PasswordHasher, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
