import { SummarizeDto } from '../dto/summarize.dto';

export const buildSummarizePrompt = (
  article: { title: string; content: string },
  dto: SummarizeDto,
) => {
  const maxLength = dto.maxLength ?? 'medium';

  return `Summarize the following article in ${maxLength} form.
Title: ${article.title}
Content:
${article.content}`;
};
