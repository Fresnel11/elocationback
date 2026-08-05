import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async enhanceDescription(originalDescription: string, _adType: string = 'immobilier'): Promise<string> {
    return originalDescription;
  }
}
