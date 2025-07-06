import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/database/prisma.service';
import { HttpExceptionFilter } from './presentation/filters/http-exception.filter';
import { GlobalZodValidationPipe } from './presentation/pipes/global-zod-validation.pipe';

async function bootstrap() {
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
  
  // Enable CORS with explicit configuration
  app.enableCors({
    origin: function (origin, callback) {
      const allowedOrigins = corsOrigins ? corsOrigins.split(',').map(o => o.trim()) : defaultOrigins;
      
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log(`🚫 CORS blocked origin: ${origin}`);
        return callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'X-Requested-With',
      'Origin',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false,
  });

  // Global pipes - Use Zod validation
  app.useGlobalPipes(
    new GlobalZodValidationPipe(),
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