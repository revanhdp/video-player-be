import {
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
  Get,
  Body,
  Delete,
  Patch,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';

interface RequestWithUser {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('comment')
export class CommentController {
  constructor(private commentService: CommentService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() dto: CreateCommentDto, @Request() req: RequestWithUser) {
    const data = await this.commentService.createComment(
      req.user.userId,
      dto.videoId,
      dto.content,
    );
    return {
      message: 'Comment created successfully',
      data,
    };
  }

  @Get('video/:videoId')
  async findAll(
    @Param('videoId') videoId: string,
    @Query() query: CommentQueryDto,
  ) {
    const result = await this.commentService.findByVideo(videoId, query);
    return {
      message: 'Comments fetched successfully',
      ...result,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async updateComment(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Request() req: RequestWithUser,
  ) {
    const data = await this.commentService.updateComment(
      id,
      req.user.userId,
      dto.content,
    );
    return {
      message: 'Comment updated successfully',
      data,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async deleteComment(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const data = await this.commentService.deleteComment(
      id,
      req.user.userId,
      req.user.role,
    );
    return {
      message: 'Comment deleted successfully',
      data,
    };
  }
}
