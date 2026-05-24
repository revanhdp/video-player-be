import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Delete,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { type Request } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.USER, UserRole.CREATOR, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('video', {
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith('video/')) {
          return callback(new Error('Only video files are allowed'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 100,
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.videoService.createVideo(file, body, user.userId);
  }

  @Get(':id')
  async getVideo(@Param('id') id: string) {
    return this.videoService.findOne(id);
  }

  @Get()
  async getAllVideo() {
    const data = await this.videoService.findAll();

    const total = data.length;

    return {
      message: 'Success',
      data,
      total: total,
    };
  }

  @Delete(':id')
  async deleteVideo(@Param('id') id: string) {
    await this.videoService.deleteVideo(id);

    return {
      message: 'Video berhasil dihapus',
    };
  }
}
