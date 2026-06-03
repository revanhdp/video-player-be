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
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateVideoDto } from './dto/create-video.dto';

interface RequestWithUser {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

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
        fileSize: 1024 * 1024 * 100, // 100MB limit
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateVideoDto,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    return this.videoService.createVideo(file, body, req.user.userId);
  }

  @Get(':id')
  async getVideo(@Param('id', ParseUUIDPipe) id: string) {
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
  @UseGuards(AuthGuard('jwt'))
  async deleteVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.videoService.deleteVideo(id, req.user.userId, req.user.role);

    return {
      message: 'Video berhasil dihapus',
    };
  }
}
