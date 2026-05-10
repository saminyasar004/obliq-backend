import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import morgan from 'morgan';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AuthResponseDto } from './modules/auth/dto/auth-response.dto';
import { UserResponseDto } from './modules/auth/dto/user-response.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middlewares
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // CORS must be enabled before security middleware like helmet
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        frontendUrl,
        frontendUrl.replace(/\/$/, ''), // matching without trailing slash
        'https://obliq-apps.netlify.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];

      // if (!origin || allowedOrigins.includes(origin)) {
      //   callback(null, true);
      // } else {
      //   callback(new Error('Not allowed by CORS'));
      // }
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Obliq API')
    .setDescription('Full Stack Task: Dynamic Obliq permission system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [AuthResponseDto, UserResponseDto],
  });
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
