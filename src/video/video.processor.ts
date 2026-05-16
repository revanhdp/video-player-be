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
    const tempDir = join(os.tmpdir(), `hls-${videoId}`);
    
    // Konfigurasi Resolusi (Adaptive Bitrate)
    const resolutions = [
      { name: '360p', width: 640, height: 360, bitrate: '800k' },
      { name: '720p', width: 1280, height: 720, bitrate: '2800k' },
    ];

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
      this.logger.log(`Memulai Multi-Resolution Transcoding: ${videoId}`);

      // 1. GENERATE THUMBNAIL
      await new Promise((resolve, reject) => {
        ffmpeg(videoUrl)
          .screenshots({
            timestamps: [1],
            filename: 'thumbnail.png',
            folder: tempDir,
            size: '640x360',
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // 2. TRANSCODING UNTUK SETIAP RESOLUSI
      for (const res of resolutions) {
        const resDir = join(tempDir, res.name);
        if (!fs.existsSync(resDir)) fs.mkdirSync(resDir);

        this.logger.log(`Transcoding ke ${res.name}...`);
        await new Promise((resolve, reject) => {
          ffmpeg(videoUrl)
            .outputOptions([
              `-vf scale=w=${res.width}:h=${res.height}:force_original_aspect_ratio=decrease`,
              `-c:v libx264`,
              `-b:v ${res.bitrate}`,
              `-profile:v baseline`,
              `-level 3.0`,
              `-start_number 0`,
              `-hls_time 10`,
              `-hls_list_size 0`,
              `-f hls`,
            ])
            .output(join(resDir, 'index.m3u8'))
            .on('end', resolve)
            .on('error', (err: any) => {
              this.logger.error(`Error transcoding ${res.name}: ${err.message}`);
              reject(err);
            })
            .run();
        });
      }

      // 3. BUAT MASTER PLAYLIST (.m3u8)
      // Master playlist ini menggabungkan semua varian resolusi
      const masterPlaylistContent = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '',
        '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360',
        '360p/index.m3u8',
        '',
        '#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720',
        '720p/index.m3u8',
      ].join('\n');

      const masterPlaylistPath = join(tempDir, 'master.m3u8');
      fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);

      // 4. UPLOAD REKURSIF SEMUA FILE KE MINIO
      const uploadDir = async (dir: string, prefix: string = '') => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            await uploadDir(filePath, join(prefix, file));
          } else {
            const remoteKey = `processed/${videoId}/${prefix ? join(prefix, file) : file}`;
            let mimetype = 'application/octet-stream';
            if (file.endsWith('.m3u8')) mimetype = 'application/x-mpegURL';
            else if (file.endsWith('.ts')) mimetype = 'video/mp2t';
            else if (file.endsWith('.png')) mimetype = 'image/png';

            await this.storageService.uploadFileFromPath(filePath, remoteKey, mimetype);
          }
        }
      };

      await uploadDir(tempDir);

      // 5. UPDATE DATABASE
      const finalVideoUrl = await this.storageService.getFileUrl(`processed/${videoId}/master.m3u8`);
      const finalThumbnailUrl = await this.storageService.getFileUrl(`processed/${videoId}/thumbnail.png`);

      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          videoUrl: finalVideoUrl, // Poin ke Master Playlist
          thumbnailUrl: finalThumbnailUrl,
          status: 'PUBLISHED',
        },
      });

      // 6. CLEANUP
      fs.rmSync(tempDir, { recursive: true, force: true });
      this.logger.log(`Multi-Resolution Transcoding Selesai! Master URL: ${finalVideoUrl}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Gagal Multi-Resolution Transcoding ${videoId}: ${error.message}`);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  }
}
