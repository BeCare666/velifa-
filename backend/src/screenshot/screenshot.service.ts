import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);
  private readonly apiKey: string;
  private readonly browserlessUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('browserless.apiKey', '');
    this.browserlessUrl = this.config.get<string>(
      'browserless.url',
      'https://chrome.browserless.io',
    );
  }

  /**
   * Takes a screenshot via Browserless.io REST API.
   * Returns the image as a Buffer, or null if it fails (non-blocking).
   */
  async capture(url: string): Promise<Buffer | null> {
    if (!this.apiKey) {
      this.logger.warn('BROWSERLESS_API_KEY not set — skipping screenshot');
      return null;
    }

    try {
      this.logger.log(`Capturing screenshot for ${url}`);
      const response = await axios.post(
        `${this.browserlessUrl}/screenshot?token=${this.apiKey}`,
        {
          url,
          options: {
            fullPage: false,
            type: 'jpeg',
            quality: 85,
          },
          gotoOptions: { waitUntil: 'networkidle2', timeout: 20000 },
          viewport: { width: 1280, height: 800 },
        },
        {
          responseType: 'arraybuffer',
          timeout: 25_000,
        },
      );

      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.warn(`Screenshot failed (non-blocking): ${error.message}`);
      return null;
    }
  }
}
