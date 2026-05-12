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
} from '@nestjs/common';
import { VideoService } from './video.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { type Request } from 'express';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
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
    return this.videoService.findOne(id)
  }

  @Get()
  async getAllVideo(){
    return await this.videoService.findAll();
  }
}
