import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SCHEDULE_REPOSITORY,
  Schedule,
  ScheduleNotFoundError,
  ScheduleNotPendingError,
  ScheduleRepositoryPort,
} from '../domain/ports/schedule-repository.port';

@Injectable()
export class CancelScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly schedule: ScheduleRepositoryPort,
  ) {}

  async execute(id: string): Promise<Schedule> {
    try {
      return await this.schedule.cancel(id);
    } catch (error) {
      if (error instanceof ScheduleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ScheduleNotPendingError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
