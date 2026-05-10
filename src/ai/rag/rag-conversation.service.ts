import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  messages: Message[];
  lastAccessAt: number;
}

@Injectable()
export class RagConversationService {
  private readonly conversations = new Map<string, Conversation>();
  private readonly maxMessages: number;
  private readonly ttlMs = 60 * 60 * 1000;

  constructor() {
    const maxMessages = Number.parseInt(
      process.env.RAG_CONVERSATION_MAX_MESSAGES ?? '20',
      10,
    );

    this.maxMessages =
      Number.isNaN(maxMessages) || maxMessages < 1 ? 20 : maxMessages;
  }

  getOrCreate(conversationId?: string): Pick<Conversation, 'id' | 'messages'> {
    this.cleanup();

    if (conversationId) {
      const existing = this.conversations.get(conversationId);
      if (existing) {
        existing.lastAccessAt = Date.now();
        return {
          id: existing.id,
          messages: [...existing.messages],
        };
      }
    }

    const id = conversationId ?? randomUUID();
    const conversation: Conversation = {
      id,
      messages: [],
      lastAccessAt: Date.now(),
    };
    this.conversations.set(id, conversation);
    return {
      id: conversation.id,
      messages: [...conversation.messages],
    };
  }

  addMessages(conversationId: string, question: string, answer: string) {
    const conv = this.conversations.get(conversationId);
    if (!conv) return;

    conv.messages.push(
      { role: 'user', content: question, timestamp: Date.now() },
      { role: 'assistant', content: answer, timestamp: Date.now() },
    );
    conv.lastAccessAt = Date.now();

    if (conv.messages.length > this.maxMessages) {
      conv.messages = conv.messages.slice(-this.maxMessages);
    }
  }

  getHistory(conversationId: string): Message[] {
    this.cleanup();

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return [];
    }

    conversation.lastAccessAt = Date.now();
    return [...conversation.messages];
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, conv] of this.conversations.entries()) {
      if (now - conv.lastAccessAt > this.ttlMs) {
        this.conversations.delete(id);
      }
    }
  }
}
