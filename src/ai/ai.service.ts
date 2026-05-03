import { Injectable, NotImplementedException } from '@nestjs/common';
import { AnalyzeDto } from './dto/analyze.dto';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { TranslateDto } from './dto/translate.dto';

@Injectable()
export class AiService {
  summarizeArticle(_articleId: string, _dto: SummarizeDto) {
    throw new NotImplementedException();
  }

  translateArticle(_articleId: string, _dto: TranslateDto) {
    throw new NotImplementedException();
  }

  analyzeArticle(_articleId: string, _dto: AnalyzeDto) {
    throw new NotImplementedException();
  }

  generate(_dto: GenerateDto) {
    throw new NotImplementedException();
  }
}
