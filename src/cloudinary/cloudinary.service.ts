import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(key: string, buffer: Buffer): Promise<string> {
    if (!key || !buffer) {
      throw new BadRequestException('key and buffer is required');
    }

    const publicId = key.replace(/\.[^/.]+$/, '');

    try {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );

        Readable.from(buffer).pipe(uploadStream);
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException('failed to upload image');
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) {
      throw new BadRequestException('key is required');
    }

    const publicId = key.replace(/\.[^/.]+$/, '');

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
    } catch (error) {
      throw new BadRequestException('failed to delete image');
    }
  }
}