import { AnalyzeDto } from '../dto/analyze.dto';

export const buildAnalyzePrompt = (
  article: { title: string; content: string },
  dto: AnalyzeDto,
) => {
  const task = dto.task ?? 'review';

  return `Analyze the following article and respond with JSON only.
Return exactly this shape:
{
  "analysis": "short analysis text",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "severity": "info"
}
Allowed severity values: info, warning, error.
Task: ${task}
Title: ${article.title}
Content:
${article.content}`;
};
