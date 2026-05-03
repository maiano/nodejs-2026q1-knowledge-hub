import { Injectable } from '@nestjs/common';

@Injectable()
export class AiSessionContextService {
  private readonly sessions = new Map<string, string[]>();

  get(sessionId: string) {
    return this.sessions.get(sessionId) ?? [];
  }

  set(sessionId: string, messages: string[]) {
    this.sessions.set(sessionId, messages);
  }

  clear(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}
