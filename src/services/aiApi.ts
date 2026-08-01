import { sendPostRequest } from './api';

export interface AiExplanation {
  ref: string;
  text: string;
  intro: string;
  explanation: string;
  lesson?: string; // Alias for explanation to satisfy existing UI expectations
  application?: string;
  prayer: string;
  wordStudy?: string;
  crossReferences?: string;
  context?: string;
  chapterInsights?: string;
}

export const getAiExplanation = async (
  book: string,
  chapter: number,
  verse: number,
  depth: 'brief' | 'standard' | 'detailed' = 'standard',
): Promise<AiExplanation | null> => {
  const res = await sendPostRequest<AiExplanation>('ai', 'explain', {
    book,
    chapter,
    verse,
    depth,
  });
  if (res.returnCode === 200 && res.returnData) {
    // Provide a `lesson` alias for backward-compatible UI code
    const data = res.returnData as AiExplanation;
    if (!data.lesson && data.explanation) {
      data.lesson = data.explanation;
    }
    return data;
  }
  return null;
};

