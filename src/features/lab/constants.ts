import { LabStage } from './types';

export const STAGE_ORDER: readonly LabStage[] = ['look', 'listen', 'learn', 'abide'];

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
