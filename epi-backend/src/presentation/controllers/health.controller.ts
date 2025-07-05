import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class HealthController {
  @Get('health')
  checkHealth(@Res() res: Response) {
    // Health check at /health (no global prefix)
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

@Controller('health')
export class ApiHealthController {
  @Get()
  checkApiHealth(@Res() res: Response) {
    // Health check at /api/health (with global prefix)
    console.log('🟢 API Health check called at /api/health:', new Date().toISOString());
    
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'epi-backend',
      version: '3.5.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      route: '/api/health'
    });
  }
}