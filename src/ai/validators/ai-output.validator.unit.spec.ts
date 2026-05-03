import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AiOutputValidator } from './ai-output.validator';

describe('AiOutputValidator', () => {
  const validator = new AiOutputValidator();

  describe('ensureText', () => {
    it('returns trimmed string', () => {
      expect(validator.ensureText('  hello  ')).toBe('hello');
    });

    it('throws on empty string', () => {
      expect(() => validator.ensureText('   ')).toThrow(
        new ServiceUnavailableException('AI service returned empty output'),
      );
    });

    it('throws on non-string value', () => {
      expect(() => validator.ensureText(null)).toThrow(
        new ServiceUnavailableException('AI service returned invalid output'),
      );
    });
  });

  describe('parseTranslate', () => {
    it('parses valid JSON output', () => {
      expect(
        validator.parseTranslate(
          '{"translatedText":"Привет","detectedLanguage":"English"}',
        ),
      ).toEqual({
        translatedText: 'Привет',
        detectedLanguage: 'English',
      });
    });

    it('parses fenced JSON output', () => {
      expect(
        validator.parseTranslate(
          '```json\n{"translatedText":"Hola","detectedLanguage":"Spanish"}\n```',
        ),
      ).toEqual({
        translatedText: 'Hola',
        detectedLanguage: 'Spanish',
      });
    });

    it('falls back to raw text and fallback language', () => {
      expect(
        validator.parseTranslate('Plain translated text', 'English'),
      ).toEqual({
        translatedText: 'Plain translated text',
        detectedLanguage: 'English',
      });
    });
  });

  describe('parseAnalyze', () => {
    it('parses valid JSON output', () => {
      expect(
        validator.parseAnalyze(
          '{"analysis":"Good","suggestions":["A","B"],"severity":"warning"}',
        ),
      ).toEqual({
        analysis: 'Good',
        suggestions: ['A', 'B'],
        severity: 'warning',
      });
    });

    it('filters non-string suggestions', () => {
      expect(
        validator.parseAnalyze(
          '{"analysis":"Good","suggestions":["A",1,true],"severity":"info"}',
        ),
      ).toEqual({
        analysis: 'Good',
        suggestions: ['A'],
        severity: 'info',
      });
    });

    it('falls back to default structured response', () => {
      expect(validator.parseAnalyze('Plain analysis text')).toEqual({
        analysis: 'Plain analysis text',
        suggestions: [],
        severity: 'info',
      });
    });
  });
});
