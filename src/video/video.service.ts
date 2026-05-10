import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) { }

  async createVideo(file: Express.Multer.File, body: any, userId: string) {
    const { title, description, tags } = body;

    // Simple slug generator
    const slug = title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    const videoUrl = `/uploads/${file.filename}`;

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
