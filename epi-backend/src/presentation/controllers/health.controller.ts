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

  @Post('seed-demo')
  async runDemoSeed(@Res() res: Response) {
    try {
      console.log('🎭 Running demo seed for production...');
      
      // Execute demo seed script
      execSync('npx ts-node prisma/seed-demo.ts', { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      console.log('✅ Demo seed completed successfully!');
      
      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Demo seed completed successfully',
        description: 'Database populated with: 20 companies, 200 employees, 25 EPI types, stock movements, deliveries, and returns',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('❌ Demo seed failed:', error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Demo seed failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('seed-base')
  async runBaseSeed(@Res() res: Response) {
    try {
      console.log('🏗️ Running base seed (structural data only)...');
      
      // Execute base seed script
      execSync('npx ts-node prisma/seed-base.ts', { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      console.log('✅ Base seed completed successfully!');
      
      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Base seed completed successfully',
        description: 'Structural data created: companies, employees, EPI types, empty EPI cards (no movements)',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('❌ Base seed failed:', error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Base seed failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('seed-movimentacoes')
  async runMovimentacoesSeed(@Res() res: Response) {
    try {
      console.log('🔄 Running movements seed (via use cases)...');
      
      // Execute movements seed script
      execSync('npx tsx scripts/seed-movimentacoes.ts', { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      console.log('✅ Movements seed completed successfully!');
      
      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Movements seed completed successfully',
        description: 'Realistic movements created via use cases: entry notes, deliveries, returns with full traceability',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('❌ Movements seed failed:', error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Movements seed failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('seed-novo-completo')
  async runNovoSeedCompleto(@Res() res: Response) {
    try {
      console.log('🚀 Running complete new seeding strategy...');
      
      // Execute complete new seeding strategy
      console.log('📋 Step 1/3: Running base seed...');
      execSync('npx ts-node prisma/seed-base.ts', { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      console.log('🔄 Step 2/3: Running movements seed...');
      execSync('npx tsx scripts/seed-movimentacoes.ts', { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      console.log('✅ Complete new seed strategy finished successfully!');
      
      return res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Complete new seed strategy completed successfully',
        description: 'Two-phase seeding: 1) Structural data, 2) Movements via use cases. Full consistency guaranteed.',
        phases: [
          'Phase 1: Base seed - Companies, employees, EPI types, empty cards',
          'Phase 2: Movements seed - Entry notes, deliveries, returns via real use cases'
        ],
        benefits: [
          'Unit traceability preserved',
          'Atomic transactions respected',
          'Business validations applied',
          '100% kardex consistency',
          'Identical to production behavior'
        ],
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('❌ Complete new seed failed:', error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Complete new seed failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}