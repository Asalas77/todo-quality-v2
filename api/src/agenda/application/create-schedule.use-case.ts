import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  CreateScheduleInput,
  SCHEDULE_REPOSITORY,
  Schedule,
  ScheduleCentroInactiveError,
  ScheduleRepositoryPort,
  ScheduleTemplateInactiveError,
} from '../domain/ports/schedule-repository.port';

@Injectable()
export class CreateScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly schedule: ScheduleRepositoryPort,
  ) {}

  async execute(input: CreateScheduleInput): Promise<Schedule> {
    try {
      return await this.schedule.create(input);
    } catch (error) {
      if (
        error instanceof ScheduleTemplateInactiveError ||
        error instanceof ScheduleCentroInactiveError
      ) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
