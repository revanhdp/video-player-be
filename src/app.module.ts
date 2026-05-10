import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VideoModule } from './video/video.module';

@Module({
  imports: [UsersModule, PrismaModule, AuthModule, VideoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
