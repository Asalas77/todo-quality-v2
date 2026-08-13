import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, User, UserRepositoryPort } from '../domain/ports/user-repository.port';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort) {}

  execute(includeInactive: boolean): Promise<User[]> {
    return this.users.findAll(includeInactive);
  }
}
