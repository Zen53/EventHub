import { Injectable } from '@nestjs/common';
import type { RegisterBody } from '@eventhub/schemas';
import { type UserRow, UsersService } from '../users/index.js';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService) {}

  register(body: RegisterBody): Promise<UserRow> {
    return this.users.create(body);
  }
}
