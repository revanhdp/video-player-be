import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const endpoint =
      this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';
    const port = this.configService.get<number>('MINIO_PORT') || 9000;

    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: `http://${endpoint}:${port}`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ACCESS_KEY')!,
        secretAccessKey: this.configService.get<string>('MINIO_SECRET_KEY')!,
      },
    });
    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET') || 'videos';
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'videos',
  ): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return fileName;
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async getFileUrl(key: string): Promise<string> {
    // For MinIO, we can return a signed URL or a direct URL if public.
    // Since we set the bucket to public in mc service, we can just return the direct URL.
    return `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.bucketName}/${key}`;
  }

  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    mimetype: string,
  ): Promise<string> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: buffer,
          ContentType: mimetype,
        }),
      );
      return fileName;
    } catch (error) {
      throw new InternalServerErrorException('Gagal upload thumbnail');
    }
  }

  async uploadFileFromPath(
    localPath: string,
    remoteKey: string,
    mimetype: string,
  ): Promise<string> {
    const fileContent = fs.readFileSync(localPath);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: remoteKey,
        Body: fileContent,
        ContentType: mimetype,
      }),
    );
    return remoteKey;
  }
}
