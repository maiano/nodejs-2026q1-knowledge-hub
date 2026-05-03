import { Injectable } from '@nestjs/common';

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private readonly requestsByEndpoint = new Map<string, number>();

  track(endpoint: string) {
    this.totalRequests += 1;
    this.requestsByEndpoint.set(
      endpoint,
      (this.requestsByEndpoint.get(endpoint) ?? 0) + 1,
    );
  }

  getStats() {
    return {
      totalRequests: this.totalRequests,
      requestsByEndpoint: Object.fromEntries(this.requestsByEndpoint),
    };
  }
}
