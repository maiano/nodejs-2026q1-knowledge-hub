import { AnalyzeDto } from '../dto/analyze.dto';

export const buildAnalyzePrompt = (
  article: { title: string; content: string },
  dto: AnalyzeDto,
) => {
  const task = dto.task ?? 'review';

  return `Task: ${task}
Title: ${article.title}
Content:
${article.content}`;
};
