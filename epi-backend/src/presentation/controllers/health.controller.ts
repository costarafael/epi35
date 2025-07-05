import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-07-05T11:43:53.000Z' },
        service: { type: 'string', example: 'epi-backend' },
        version: { type: 'string', example: '3.5.0' },
        database: { type: 'string', example: 'connected' },
      },
    },
  })
  async checkHealth() {
    try {
      // Simple database connectivity check
      await this.prismaService.$queryRaw`SELECT 1`;
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'epi-backend',
        version: '3.5.0',
        database: 'connected',
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'epi-backend',
        version: '3.5.0',
        database: 'disconnected',
        error: error.message,
      };
    }
  }
}