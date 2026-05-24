/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CommentService', () => {
  let service: CommentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    video: {
      findUnique: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    const userId = 'user-1';
    const videoId = 'video-1';
    const content = 'Test comment content';

    it('should create comment when video exists', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue({ id: videoId });
      const mockComment = {
        id: 'comment-1',
        content,
        userId,
        videoId,
        createdAt: new Date(),
        user: { id: userId, name: 'John Doe', email: 'john@example.com' },
      };
      mockPrismaService.comment.create.mockResolvedValue(mockComment);

      const result = await service.createComment(userId, videoId, content);

      expect(prisma.video.findUnique).toHaveBeenCalledWith({
        where: { id: videoId },
      });
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: { content, userId, videoId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundException if video does not exist', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(null);

      await expect(
        service.createComment(userId, videoId, content),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByVideo', () => {
    const videoId = 'video-1';
    const query = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    };

    it('should return paginated comments when video exists', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue({ id: videoId });
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Hello',
          user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
        },
      ];
      mockPrismaService.comment.count.mockResolvedValue(1);
      mockPrismaService.comment.findMany.mockResolvedValue(mockComments);

      const result = await service.findByVideo(videoId, query);

      expect(prisma.video.findUnique).toHaveBeenCalledWith({
        where: { id: videoId },
      });
      expect(prisma.comment.count).toHaveBeenCalledWith({ where: { videoId } });
      expect(prisma.comment.findMany).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockComments,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should throw NotFoundException if video does not exist', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(null);

      await expect(service.findByVideo(videoId, query)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateComment', () => {
    const id = 'comment-1';
    const userId = 'user-1';
    const content = 'Updated content';

    it('should update successfully if comment exists and belongs to user', async () => {
      const mockComment = { id, userId, content: 'Old content' };
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);
      mockPrismaService.comment.update.mockResolvedValue({
        ...mockComment,
        content,
        user: { id: userId, name: 'John Doe', email: 'john@example.com' },
      });

      const result = await service.updateComment(id, userId, content);

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({ where: { id } });
      expect(prisma.comment.update).toHaveBeenCalled();
      expect(result.content).toBe(content);
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.updateComment(id, userId, content)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if comment does not belong to user', async () => {
      const mockComment = { id, userId: 'other-user', content: 'Old content' };
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);

      await expect(service.updateComment(id, userId, content)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteComment', () => {
    const id = 'comment-1';
    const userId = 'user-1';

    it('should delete comment successfully if user is owner', async () => {
      const mockComment = { id, userId, video: { userId: 'creator-1' } };
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);

      const result = await service.deleteComment(id, userId, 'USER');

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { video: { select: { userId: true } } },
      });
      expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual({ id });
    });

    it('should delete comment successfully if user is ADMIN', async () => {
      const mockComment = {
        id,
        userId: 'owner-1',
        video: { userId: 'creator-1' },
      };
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);

      const result = await service.deleteComment(id, 'admin-1', 'ADMIN');

      expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual({ id });
    });

    it('should delete comment successfully if user is video creator', async () => {
      const creatorId = 'creator-1';
      const mockComment = {
        id,
        userId: 'owner-1',
        video: { userId: creatorId },
      };
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);

      const result = await service.deleteComment(id, creatorId, 'CREATOR');

      expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual({ id });
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.deleteComment(id, userId, 'USER')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const mockComment = {
        id,
        userId: 'owner-1',
        video: { userId: 'creator-1' },
      };
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);

      await expect(
        service.deleteComment(id, 'unauthorized-user', 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
