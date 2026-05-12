import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideoService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) { }

  async createVideo(file: Express.Multer.File, body: any, userId: string) {
    const { title, description, tags } = body;

    // Simple slug generator
    const slug = title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    // Upload to MinIO
    const fileKey = await this.storageService.uploadFile(file);
    const videoUrl = await this.storageService.getFileUrl(fileKey);

    return await this.prisma.video.create({
      data: {
        title,
        slug: `${slug}-${Date.now()}`,
        description,
        videoUrl,
        userId,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
      },
    });
  }

  async findAll() {
    return await this.prisma.video.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.video.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        comments: true,
      },
    });
  }
}
