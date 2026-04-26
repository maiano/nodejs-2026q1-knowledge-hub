import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  config();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);

  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configSwagger = new DocumentBuilder()
    .setTitle('Knowledge Hub API')
    .setDescription('API documentation for Knowledge Hub')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('doc', app, document);

  const PORT = process.env.PORT || 4000;

  await app.listen(PORT);

  let isShuttingDown = false;

  const shutdown = async (error: unknown, label: string) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    logger.error(
      {
        err: error,
        event: label,
      },
      'Process-level error triggered graceful shutdown',
    );

    try {
      await app.close();
    } finally {
      process.exit(1);
    }
  };

  process.on('uncaughtException', (error) =>
    shutdown(error, 'uncaughtException'),
  );

  process.on('unhandledRejection', (reason) =>
    shutdown(reason, 'unhandledRejection'),
  );
}

bootstrap();
