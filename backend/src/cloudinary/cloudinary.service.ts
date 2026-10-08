import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('cloudinary.cloudName'),
      api_key:    this.config.get<string>('cloudinary.apiKey'),
      api_secret: this.config.get<string>('cloudinary.apiSecret'),
      secure: true,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    folder = 'velifa/screenshots',
    publicId?: string,
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
          format: 'jpg',
          transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            return reject(error ?? new Error('Cloudinary upload failed'));
          }
          resolve({
            url:      result.secure_url,
            publicId: result.public_id,
          });
        },
      );
      uploadStream.end(buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted Cloudinary image: ${publicId}`);
    } catch (error: any) {
      this.logger.warn(`Failed to delete Cloudinary image: ${error.message}`);
    }
  }
}
