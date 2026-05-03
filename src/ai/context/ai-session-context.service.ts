import { Injectable } from '@nestjs/common';

type Message = {
  role: 'user' | 'model';
  text: string;
};

type Session = {
  messages: Message[];
  lastAccessAt: number;
};

const MAX_MESSAGES = 6;
const SESSION_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AiSessionContextService {
  private readonly sessions = new Map<string, Session>();

  get(sessionId: string): Message[] {
    this.cleanupExpiredSessions();
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    session.lastAccessAt = Date.now();
    return [...session.messages];
  }

  set(sessionId: string, role: 'user' | 'model', text: string) {
    const normalizedText = text.trim();

    if (!normalizedText) {
      return;
    }

    let session = this.sessions.get(sessionId);

    if (!session) {
      session = { messages: [], lastAccessAt: Date.now() };
      this.sessions.set(sessionId, session);
    }

    session.messages.push({ role, text: normalizedText });
    session.lastAccessAt = Date.now();

    if (session.messages.length > MAX_MESSAGES) {
      session.messages = session.messages.slice(-MAX_MESSAGES);
    }
  }

  clear(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  private cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastAccessAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}
