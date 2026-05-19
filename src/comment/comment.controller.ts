import { Controller, Param, Post, Request, UseGuards, Get, Body } from '@nestjs/common';
import { CommentService } from './comment.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('comment')
export class CommentController {
    constructor(private commentService: CommentService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Body() dto: { videoId: string; content: string }, @Request() req) {
        const data = await this.commentService.createComment(req.user.userId, dto.videoId, dto.content);
        return {
            message: 'Comment created successfully',
            data
        }
    }

    @Get('video/:videoId')
    async findAll(@Param('videoId') videoId: string) {
        const data = this.commentService.findByVideo(videoId)
        return {
            message: 'Comments fetched successfully',
            data
        }
    }
}

