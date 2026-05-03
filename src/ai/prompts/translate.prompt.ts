import { TranslateDto } from '../dto/translate.dto';

export const buildTranslatePrompt = (
  article: { title: string; content: string },
  dto: TranslateDto,
) => {
  const sourceLanguage = dto.sourceLanguage
    ? `Source language: ${dto.sourceLanguage}`
    : 'Detect source language automatically';

  return `Translate the following article and respond with JSON only.
Return exactly this shape:
{
  "translatedText": "translated article text",
  "detectedLanguage": "detected source language"
}
Target language: ${dto.targetLanguage}
${sourceLanguage}
Title: ${article.title}
Content:
${article.content}`;
};
