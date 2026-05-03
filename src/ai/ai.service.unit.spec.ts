import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { AiCacheService } from './cache/ai-cache.service';
import { AiSessionContextService } from './context/ai-session-context.service';
import { GeminiService } from './gemini/gemini.service';
import { AiService } from './ai.service';
import { AiUsageService } from './usage/ai-usage.service';
import { AiOutputValidator } from './validators/ai-output.validator';
import { clearPrismaMock, prismaMock } from '../common/testing/prisma.mock';

describe('AiService', () => {
  let service: AiService;

  const geminiMock = {
    generate: vi.fn(),
  };

  const cacheMock = {
    buildKey: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    getStats: vi.fn(),
  };

  const usageMock = {
    track: vi.fn(),
    getStats: vi.fn(),
  };

  const validatorMock = {
    ensureText: vi.fn(),
    parseTranslate: vi.fn(),
    parseAnalyze: vi.fn(),
  };

  const sessionContextMock = {
    get: vi.fn(),
    set: vi.fn(),
  };

  const article = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    title: 'NestJS AI',
    content: 'Article content for AI tests.',
    status: 'DRAFT',
    authorId: null,
    categoryId: null,
    createdAt: new Date('2026-05-01T12:00:00.000Z'),
    updatedAt: new Date('2026-05-02T12:00:00.000Z'),
  };

  beforeEach(async () => {
    clearPrismaMock();
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GeminiService, useValue: geminiMock },
        { provide: AiCacheService, useValue: cacheMock },
        { provide: AiUsageService, useValue: usageMock },
        { provide: AiOutputValidator, useValue: validatorMock },
        { provide: AiSessionContextService, useValue: sessionContextMock },
      ],
    }).compile();

    service = module.get(AiService);
  });

  describe('summarizeArticle', () => {
    it('returns cached result without calling Gemini', async () => {
      const cachedResult = {
        articleId: article.id,
        summary: 'Cached summary',
        originalLength: article.content.length,
        summaryLength: 14,
      };

      prismaMock.article.findUnique.mockResolvedValue(article);
      cacheMock.buildKey.mockReturnValue('summary-key');
      cacheMock.get.mockReturnValue(cachedResult);

      const result = await service.summarizeArticle(article.id, {
        maxLength: 'short',
      });

      expect(result).toEqual(cachedResult);
      expect(usageMock.track).toHaveBeenCalledWith('summarize');
      expect(geminiMock.generate).not.toHaveBeenCalled();
      expect(cacheMock.set).not.toHaveBeenCalled();
    });

    it('generates and caches summary on cache miss', async () => {
      prismaMock.article.findUnique.mockResolvedValue(article);
      cacheMock.buildKey.mockReturnValue('summary-key');
      cacheMock.get.mockReturnValue(null);
      geminiMock.generate.mockResolvedValue({
        text: 'Raw summary',
        usage: { promptTokens: 10, outputTokens: 5, totalTokens: 15 },
      });
      validatorMock.ensureText.mockReturnValue('Clean summary');

      const result = await service.summarizeArticle(article.id, {});

      expect(geminiMock.generate).toHaveBeenCalledTimes(1);
      expect(validatorMock.ensureText).toHaveBeenCalledWith('Raw summary');
      expect(result).toEqual({
        articleId: article.id,
        summary: 'Clean summary',
        originalLength: article.content.length,
        summaryLength: 'Clean summary'.length,
      });
      expect(usageMock.track).toHaveBeenCalledWith(
        'summarize',
        { promptTokens: 10, outputTokens: 5, totalTokens: 15 },
        expect.any(Number),
      );
      expect(cacheMock.set).toHaveBeenCalledWith('summary-key', result);
    });

    it('throws NotFoundException when article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(service.summarizeArticle(article.id, {})).rejects.toThrow(
        new NotFoundException(`Article ${article.id} not found`),
      );
    });
  });

  describe('translateArticle', () => {
    it('parses translated output and caches result', async () => {
      prismaMock.article.findUnique.mockResolvedValue(article);
      cacheMock.buildKey.mockReturnValue('translate-key');
      cacheMock.get.mockReturnValue(null);
      geminiMock.generate.mockResolvedValue({
        text: '{"translatedText":"Привет","detectedLanguage":"English"}',
        usage: { promptTokens: 12, outputTokens: 8, totalTokens: 20 },
      });
      validatorMock.parseTranslate.mockReturnValue({
        translatedText: 'Привет',
        detectedLanguage: 'English',
      });

      const result = await service.translateArticle(article.id, {
        targetLanguage: 'Russian',
      });

      expect(validatorMock.parseTranslate).toHaveBeenCalledWith(
        '{"translatedText":"Привет","detectedLanguage":"English"}',
        undefined,
      );
      expect(result).toEqual({
        articleId: article.id,
        translatedText: 'Привет',
        detectedLanguage: 'English',
      });
      expect(cacheMock.set).toHaveBeenCalledWith('translate-key', result);
    });
  });

  describe('analyzeArticle', () => {
    it('returns parsed structured analysis', async () => {
      prismaMock.article.findUnique.mockResolvedValue(article);
      geminiMock.generate.mockResolvedValue({
        text: '{"analysis":"Looks good","suggestions":["Add examples"],"severity":"info"}',
        usage: { promptTokens: 14, outputTokens: 7, totalTokens: 21 },
      });
      validatorMock.parseAnalyze.mockReturnValue({
        analysis: 'Looks good',
        suggestions: ['Add examples'],
        severity: 'info',
      });

      const result = await service.analyzeArticle(article.id, {
        task: 'review',
      });

      expect(validatorMock.parseAnalyze).toHaveBeenCalled();
      expect(result).toEqual({
        articleId: article.id,
        analysis: 'Looks good',
        suggestions: ['Add examples'],
        severity: 'info',
      });
    });
  });

  describe('generate', () => {
    it('returns plain generated result without session', async () => {
      geminiMock.generate.mockResolvedValue({
        text: 'Generated answer',
        usage: { promptTokens: 5, outputTokens: 4, totalTokens: 9 },
      });
      validatorMock.ensureText.mockReturnValue('Generated answer');

      const result = await service.generate({ prompt: 'Hello' });

      expect(sessionContextMock.get).not.toHaveBeenCalled();
      expect(sessionContextMock.set).not.toHaveBeenCalled();
      expect(result).toEqual({ result: 'Generated answer' });
    });

    it('includes session history and stores user and model messages', async () => {
      sessionContextMock.get.mockReturnValue([
        { role: 'user', text: 'Previous question' },
        { role: 'model', text: 'Previous answer' },
      ]);
      geminiMock.generate.mockResolvedValue({
        text: 'New answer',
        usage: { promptTokens: 6, outputTokens: 4, totalTokens: 10 },
      });
      validatorMock.ensureText.mockReturnValue('New answer');

      const result = await service.generate({
        prompt: 'Current question',
        sessionId: 'session-1',
      });

      expect(geminiMock.generate).toHaveBeenCalledWith(
        'User: Previous question\nAssistant: Previous answer\nUser: Current question',
      );
      expect(sessionContextMock.set).toHaveBeenNthCalledWith(
        1,
        'session-1',
        'user',
        'Current question',
      );
      expect(sessionContextMock.set).toHaveBeenNthCalledWith(
        2,
        'session-1',
        'model',
        'New answer',
      );
      expect(result).toEqual({ result: 'New answer' });
    });
  });

  describe('getUsage', () => {
    it('merges usage and cache stats', () => {
      usageMock.getStats.mockReturnValue({
        totalRequests: 3,
        requestsByEndpoint: {
          summarize: 1,
          translate: 1,
          analyze: 1,
          generate: 0,
        },
      });
      cacheMock.getStats.mockReturnValue({
        size: 2,
        ttlSec: 300,
        hits: 1,
        misses: 2,
        hitRatio: '33%',
      });

      expect(service.getUsage()).toEqual({
        totalRequests: 3,
        requestsByEndpoint: {
          summarize: 1,
          translate: 1,
          analyze: 1,
          generate: 0,
        },
        cache: {
          size: 2,
          ttlSec: 300,
          hits: 1,
          misses: 2,
          hitRatio: '33%',
        },
      });
    });
  });
});
