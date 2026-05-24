import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommentQueryDto } from './dto/comment-query.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async createComment(userId: string, videoId: string, content: string) {
    const videoExists = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!videoExists) {
      throw new NotFoundException(`Video with ID ${videoId} not found`);
    }

    return this.prisma.comment.create({
      data: { content, userId, videoId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByVideo(videoId: string, query: CommentQueryDto) {
    const videoExists = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!videoExists) {
      throw new NotFoundException(`Video with ID ${videoId} not found`);
    }

    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    const [total, data] = await Promise.all([
      this.prisma.comment.count({ where: { videoId } }),
      this.prisma.comment.findMany({
        where: { videoId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async updateComment(id: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException(
        `You do not have permission to edit this comment`,
      );
    }

    return this.prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteComment(id: string, userId: string, userRole: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        video: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    const isCommentOwner = comment.userId === userId;
    const isAdmin = userRole === 'ADMIN';
    const isVideoCreator = comment.video?.userId === userId;

    if (!isCommentOwner && !isAdmin && !isVideoCreator) {
      throw new ForbiddenException(
        `You do not have permission to delete this comment`,
      );
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { id };
  }
}
