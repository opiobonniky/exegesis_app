import { LabStage } from './types';

export const STAGE_ORDER: readonly LabStage[] = ['look', 'listen', 'learn', 'abide'];

export const STAGE_TIME: Record<string, string> = {
  look: '8–12 min',
  listen: '5–15 min',
  learn: '15–25 min',
  abide: '8–12 min',
};

export const STAGE_DESC: Record<string, string> = {
  look: 'Observe the passage carefully',
  listen: 'Meditate through repetition',
  learn: 'Understand the deeper meaning',
  abide: 'Apply what you\'ve learned',
};

export const STAGE_PURPOSE: Record<string, string> = {
  look: 'Look closely at the text. What do you notice? Observation comes before interpretation — train your eyes to see what the text actually says.',
  listen: 'Hear the Word repeatedly. Let Scripture sink past your defenses into your heart. This ancient practice of lectio divina opens you to God\'s voice.',
  learn: 'Now dig deeper. Original languages, cross-references, commentaries, and historical context reveal what the passage meant to its first hearers.',
  abide: 'The goal of study is transformation. Record what God has shown you, respond in prayer, and commit to one practical step of application.',
};

export const LISTEN_OPTIONS = [
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '3x', value: 3 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 },
];

export const LOOK_PROMPTS = [
  'What specific words or phrases stand out to you in this passage?',
  'Who is speaking? Who is listening or being addressed?',
  'What commands, promises, warnings, or truths do you see?',
  'What is repeated in this passage?',
  'What contrasts do you notice (light/darkness, before/after, etc.)?',
  'What questions does this passage raise in your mind?',
];

export const STAGE_ICONS: Record<string, string> = {
  look: 'Eye',
  listen: 'Ear',
  learn: 'Brain',
  abide: 'Heart',
};

