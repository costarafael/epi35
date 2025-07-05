import { Controller, Get, Post, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { execSync } from 'child_process';

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

  @Post('seed')
  async runSeed(@Res() res: Response) {
    try {
      console.log('🌱 Running database seed...');
      
      // Execute compiled seed
      execSync('node prisma/seed.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('✅ Database seeded successfully!');
      
      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Database seeded successfully',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('❌ Seed failed:', error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Seed failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}