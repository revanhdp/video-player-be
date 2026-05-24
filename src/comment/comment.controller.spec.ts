/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';

describe('CommentController', () => {
  let controller: CommentController;
  let service: CommentService;

  const mockCommentService = {
    createComment: jest.fn(),
    findByVideo: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        {
          provide: CommentService,
          useValue: mockCommentService,
        },
      ],
    }).compile();

    controller = module.get<CommentController>(CommentController);
    service = module.get<CommentService>(CommentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call commentService.createComment and return result', async () => {
      const dto: CreateCommentDto = {
        videoId: 'e28bbd91-3829-4d64-8149-a23f7db20163',
        content: 'Cool video!',
      };
      const req = { user: { userId: 'user-1' } };
      const mockResult = {
        id: 'comment-1',
        content: dto.content,
        userId: 'user-1',
        videoId: dto.videoId,
      };
      mockCommentService.createComment.mockResolvedValue(mockResult);

      const result = await controller.create(dto, req);

      expect(service.createComment).toHaveBeenCalledWith(
        'user-1',
        dto.videoId,
        dto.content,
      );
      expect(result).toEqual({
        message: 'Comment created successfully',
        data: mockResult,
      });
    });
  });

  describe('findAll', () => {
    it('should call commentService.findByVideo with query parameters and return result', async () => {
      const videoId = 'video-uuid';
      const query: CommentQueryDto = { page: 1, limit: 10 };
      const mockResult = {
        data: [{ id: 'comment-1', content: 'Great!' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockCommentService.findByVideo.mockResolvedValue(mockResult);

      const result = await controller.findAll(videoId, query);

      expect(service.findByVideo).toHaveBeenCalledWith(videoId, query);
      expect(result).toEqual({
        message: 'Comments fetched successfully',
        ...mockResult,
      });
    });
  });

  describe('updateComment', () => {
    it('should call commentService.updateComment and return result', async () => {
      const id = 'comment-1';
      const dto: UpdateCommentDto = { content: 'Updated comment text' };
      const req = { user: { userId: 'user-1' } };
      const mockResult = { id, content: dto.content, userId: 'user-1' };
      mockCommentService.updateComment.mockResolvedValue(mockResult);

      const result = await controller.updateComment(id, dto, req);

      expect(service.updateComment).toHaveBeenCalledWith(
        id,
        'user-1',
        dto.content,
      );
      expect(result).toEqual({
        message: 'Comment updated successfully',
        data: mockResult,
      });
    });
  });

  describe('deleteComment', () => {
    it('should call commentService.deleteComment and return result', async () => {
      const id = 'comment-1';
      const req = { user: { userId: 'user-1', role: 'USER' } };
      const mockResult = { id };
      mockCommentService.deleteComment.mockResolvedValue(mockResult);

      const result = await controller.deleteComment(id, req);

      expect(service.deleteComment).toHaveBeenCalledWith(id, 'user-1', 'USER');
      expect(result).toEqual({
        message: 'Comment deleted successfully',
        data: mockResult,
      });
    });
  });
});
