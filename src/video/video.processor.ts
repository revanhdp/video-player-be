import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
import * as fs from 'fs';
import * as os from 'os';
import { join } from 'path';

@Processor('video-processing')
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    private storageService: StorageService,
    private prisma: PrismaService,
  ) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }

  @Process('process-video')
  async handleVideoProcessing(job: Job) {
    const { videoId, videoUrl } = job.data;

    // Create a unique temporary directory for this video processing task
    const tempDir = join(os.tmpdir(), `hls-${videoId}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const thumbnailFileName = `thumbnail.png`;
    const hlsFileName = `index.m3u8`;
    const hlsPath = join(tempDir, hlsFileName);

    try {
      this.logger.log(`Memulai pemrosesan video: ${videoId}`);

      // 1. GENERATE THUMBNAIL VIDEO
      await new Promise((resolve, reject) => {
        ffmpeg(videoUrl)
          .screenshots({
            timestamps: [1],
            filename: thumbnailFileName,
            folder: tempDir,
            size: '640x360',
          })
          .on('end', resolve)
          .on('error', (err: Error) => {
            this.logger.error(`Error saat membuat screenshot: ${err.message}`);
            reject(err);
          });
      });

      // 2. HLS TRANSCODING
      this.logger.log(`Memulai Transcoding HLS untuk video: ${videoId}`);
      await new Promise((resolve, reject) => {
        ffmpeg(videoUrl)
          .outputOptions([
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 0',
            '-hls_time 10',
            '-hls_list_size 0',
            '-f hls',
          ])
          .output(hlsPath)
          .on('end', resolve)
          .on('error', (err: Error) => {
            this.logger.error(`Error saat transcoding HLS: ${err.message}`);
            reject(err);
          })
          .run();
      });

      // 3. UPLOAD ALL FILES (Thumbnail + .m3u8 + .ts)
      const files = fs.readdirSync(tempDir);
      let finalThumbnailUrl = '';
      let finalVideoUrl = '';

      for (const file of files) {
        const filePath = join(tempDir, file);
        const remoteKey = `processed/${videoId}/${file}`;

        // Determine mimetype
        let mimetype = 'application/octet-stream';
        if (file.endsWith('.m3u8')) mimetype = 'application/x-mpegURL';
        else if (file.endsWith('.ts')) mimetype = 'video/mp2t';
        else if (file.endsWith('.png')) mimetype = 'image/png';

        await this.storageService.uploadFileFromPath(filePath, remoteKey, mimetype);

        const publicUrl = await this.storageService.getFileUrl(remoteKey);
        if (file === thumbnailFileName) finalThumbnailUrl = publicUrl;
        if (file === hlsFileName) finalVideoUrl = publicUrl;
      }

      // 4. UPDATE DATABASE
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          thumbnailUrl: finalThumbnailUrl,
          videoUrl: finalVideoUrl, // Points to the .m3u8 index file
          status: 'PUBLISHED',
        },
      });

      // 5. CLEANUP
      fs.rmSync(tempDir, { recursive: true, force: true });
      this.logger.log(`Pemrosesan selesai! Video HLS: ${finalVideoUrl}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Gagal memproses video ${videoId}: ${error.message}`);
      // Ensure temp directory is cleaned up even on failure
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  }
}
