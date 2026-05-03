import { Injectable } from '@nestjs/common';

export type TranslateOutput = {
  translatedText: string;
  detectedLanguage: string;
};

export type AnalyzeOutput = {
  analysis: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';
};

const VALID_SEVERITY = ['info', 'warning', 'error'] as const;

@Injectable()
export class AiOutputValidator {
  ensureText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  parseTranslate(raw: string, fallbackLanguage?: string): TranslateOutput {
    try {
      const clean = this.cleanJson(raw);
      const parsed = JSON.parse(clean);

      if (
        typeof parsed.translatedText === 'string' &&
        typeof parsed.detectedLanguage === 'string'
      ) {
        return {
          translatedText: parsed.translatedText.trim(),
          detectedLanguage: parsed.detectedLanguage.trim(),
        };
      }
    } catch {}

    return {
      translatedText: this.ensureText(raw),
      detectedLanguage: fallbackLanguage ?? 'unknown',
    };
  }

  parseAnalyze(raw: string): AnalyzeOutput {
    try {
      const clean = this.cleanJson(raw);
      const parsed = JSON.parse(clean);

      if (
        typeof parsed.analysis === 'string' &&
        Array.isArray(parsed.suggestions) &&
        VALID_SEVERITY.includes(parsed.severity)
      ) {
        return {
          analysis: parsed.analysis.trim(),
          suggestions: parsed.suggestions.filter(
            (s: unknown) => typeof s === 'string',
          ),
          severity: parsed.severity,
        };
      }
    } catch {}

    return {
      analysis: this.ensureText(raw),
      suggestions: [],
      severity: 'info',
    };
  }

  private cleanJson(raw: string): string {
    return raw.replace(/```json|```/g, '').trim();
  }
}
