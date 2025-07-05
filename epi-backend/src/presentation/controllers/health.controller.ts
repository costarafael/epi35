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

  @Post('deploy-db')
  async deployDatabase(@Res() res: Response) {
    try {
      console.log('🚀 Starting database deployment...');
      
      // Deploy migrations
      console.log('📦 Deploying migrations...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      // Run seed
      console.log('🌱 Running database seed...');
      execSync('npx prisma db seed', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      console.log('✅ Database deployment completed!');
      
      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Database deployed and seeded successfully',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('❌ Database deployment failed:', error);
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Database deployment failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}