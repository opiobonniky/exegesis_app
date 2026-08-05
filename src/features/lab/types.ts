export interface BookItem {
  name: string;
  chapters: number;
  verses: number;
  testament: 'Old' | 'New';
}

export type LabStage = 'look' | 'listen' | 'learn' | 'abide' | 'apply';
export type PassageSubStage = 'book' | 'chapter' | 'verse';
