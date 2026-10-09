import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service';

/** GET /plans — prix publics affichés sur la page Tarifs (sans identifiants Lemon Squeezy). */
@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  async list() {
    return this.plans.publicPlans();
  }
}
