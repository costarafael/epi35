import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class HealthController {
  @Get('health')
  checkHealth(@Res() res: Response) {
    // Ultra-simple health check - no dependencies, no async, no database
    console.log('Health check called at:', new Date().toISOString());
    
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'epi-backend',
      version: '3.5.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
    });
  }

  @Get('api/health')
  checkHealthApi(@Res() res: Response) {
    // Backup route for /api/health in case global prefix causes issues
    console.log('API Health check called at:', new Date().toISOString());
    
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'epi-backend',
      version: '3.5.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      route: 'api/health',
    });
  }
}