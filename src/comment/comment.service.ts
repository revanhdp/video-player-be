import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentService {
    constructor(private prisma: PrismaService) {}

    async createComment(userId: string, videoId: string, content: string) {
        return this.prisma.comment.create({
            data: { content, userId, videoId },
            include: { user: { select: { name: true } }
        }
        });
    }

    async findByVideo(videoId: string){
        return this.prisma.comment.findMany({
            where: { videoId },
            include: { user : { select: { name: true }}},

            orderBy: { createdAt: 'desc'}
        });
    }

    async deleteComment(id: string, userId: string) {
        return this.prisma.comment.deleteMany({
            where: { id, userId }
        })
    }

}
