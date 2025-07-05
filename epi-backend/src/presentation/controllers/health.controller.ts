import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('health')
export class HealthController {
  @Get()
  checkHealth(@Res() res: Response) {
    // Health check - will be at /health (excluded from global prefix)
    console.log('🟢 Health check called at /health:', new Date().toISOString());
    
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'epi-backend',
      version: '3.5.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      route: '/health'
    });
  }
}