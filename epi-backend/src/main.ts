import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/database/prisma.service';
import { HttpExceptionFilter } from './presentation/filters/http-exception.filter';
import { GlobalZodValidationPipe } from './presentation/pipes/global-zod-validation.pipe';

async function bootstrap() {
  // 🔧 FORCE MIGRATION ON STARTUP (temporary fix for render deploy issue)
  if (process.env.NODE_ENV === 'production') {
    console.log('🔧 Applying pending migrations on startup...');
    try {
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations applied successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
    }
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix - but exclude health endpoint for Render
  app.setGlobalPrefix('api', {
    exclude: ['health']
  });

  // CORS configuration - Allow frontend development
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const defaultOrigins = [
    'http://localhost:5175',  // Vite dev server default
    'http://localhost:5156',  // Frontend dev port
    'http://localhost:5157',  // Frontend dev port alternative
    'http://localhost:3000',  // Local development
    'https://epi-frontend.vercel.app', // Production frontend (if exists)
  ];
  
  // CORS Configuration - PERMISSIVE for development
  console.log('🌐 CORS configured in PERMISSIVE mode for all origins');
  
  // Permissive CORS middleware
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`🔍 Request from origin: ${origin || 'no-origin'}`);
    
    // Always allow the origin that made the request
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      console.log(`✅ CORS allowed for origin: ${origin}`);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
      console.log('✅ CORS allowed for no-origin request');
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Expose-Headers', '*');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    if (req.method === 'OPTIONS') {
      console.log('✅ OPTIONS preflight handled');
      res.status(200).end();
      return;
    }
    
    next();
  });
  
  // Also enable NestJS CORS as fallback
  app.enableCors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: '*',
    exposedHeaders: '*',
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false,
  });

  // Global pipes - Re-enabled after fixing controller route conflicts
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger configuration
  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', true);
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('EPI Backend API')
      .setDescription('Backend do Módulo de Gestão de EPIs v3.5 - API para gestão de equipamentos de proteção individual')
      .setVersion('3.5.0')
      .addTag('almoxarifados', 'Gestão de almoxarifados')
      .addTag('tipos-epi', 'Gestão de tipos de EPI')
      .addTag('colaboradores', 'Gestão de colaboradores')
      .addTag('notas-movimentacao', 'Notas de movimentação de estoque')
      .addTag('entregas', 'Entregas de EPIs para colaboradores')
      .addTag('devolucoes', 'Devoluções de EPIs')
      .addTag('estoque', 'Consultas de estoque')
      .addTag('fichas', 'Fichas de colaboradores')
      .addTag('relatorios', 'Relatórios gerenciais')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    });
  }

  // Prisma shutdown hooks
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // Start server
  const port = configService.get<number>('PORT', 3000);
  const server = await app.listen(port);
  
  // Configure server timeouts for Render deployment
  server.keepAliveTimeout = 120000; // 120 seconds
  server.headersTimeout = 120000;   // 120 seconds

  console.log(`
  🚀 EPI Backend API is running!
  📖 Swagger docs: http://localhost:${port}/api/docs
  🌐 Server: http://localhost:${port}
  🔧 Environment: ${configService.get<string>('NODE_ENV')}
  `);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});