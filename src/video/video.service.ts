import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { CreateVideoDto } from './dto/create-video.dto';

@Injectable()
export class VideoService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @InjectQueue('video-processing') private videoQueue: Queue,
  ) {}

  async createVideo(file: Express.Multer.File, body: CreateVideoDto, userId: string) {
    const { title, description, tags } = body;

    // Simple slug generator
    const slug = title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    // Upload to MinIO
    const fileKey = await this.storageService.uploadFile(file);
    const videoUrl = await this.storageService.getFileUrl(fileKey);

    const video = await this.prisma.video.create({
      data: {
        title,
        slug: `${slug}-${Date.now()}`,
        description,
        videoUrl,
        userId,
        tags: tags
          ? Array.isArray(tags)
            ? tags
            : tags.split(',').map((t: string) => t.trim())
          : [],
      },
    });

    // Add to processing queue
    await this.videoQueue.add(
      'process-video',
      {
        videoId: video.id,
        videoUrl: video.videoUrl,
      },
      {
        attempts: 2,
      },
    );

    return video;
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
    const video = await this.prisma.video.findUnique({
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

    if (!video) {
      throw new NotFoundException(`Video dengan ID ${id} tidak ditemukan`);
    }

    return video;
  }

  async deleteVideo(id: string, userId: string, userRole: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException(`Video dengan ID ${id} tidak ditemukan`);
    }

    const isOwner = video.userId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        `Anda tidak memiliki izin untuk menghapus video ini`,
      );
    }

    // 1. Hapus semua file terkait di MinIO
    // Jika masih dalam status PROCESSING, URL menunjuk ke raw video.
    // Jika sudah PUBLISHED, URL menunjuk ke master HLS. Kita bersihkan foldernya.
    await this.storageService.deleteFileByUrl(video.videoUrl);
    await this.storageService.deleteFolder(`processed/${id}`);

    // 2. Hapus data dari database
    return await this.prisma.video.delete({
      where: { id },
    });
  }
}
