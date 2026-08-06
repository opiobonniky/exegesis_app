import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import LabStudiesSection from '../src/features/strongs-dictionary/components/LabStudiesSection';
import { sendPostRequest } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  sendPostRequest: jest.fn(),
}));

jest.mock(
  '../src/features/strongs-dictionary/components/StudyRollPanel',
  () => ({
    __esModule: true,
    default: ({ open, children }: any) => (open ? children : null),
  }),
);

const mockedSendPostRequest = sendPostRequest as jest.MockedFunction<
  typeof sendPostRequest
>;

const colors = {
  primary: '#2563EB',
  success: '#16A34A',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#4B5563',
  muted: '#9CA3AF',
};

const summary = {
  id: 'session-1',
  passageRef: 'John 3:16',
  bookName: 'John',
  chapter: 3,
  verseStart: 16,
  verseEnd: 16,
  currentStage: 'completed',
  completed: true,
  updatedOn: '2026-08-06T10:00:00.000Z',
};

const detail = {
  ...summary,
  lookNotes: JSON.stringify({
    0: 'God loved the world and gave his Son.',
  }),
  lookPromptsJson: JSON.stringify(['What words stand out?']),
  listenCompleted: true,
  listenDuration: 300,
  listenElapsed: 240,
  learnNotes: 'The verse reveals sacrificial love.',
  abideReflection: 'God initiates salvation through love.',
  abidePrayer: 'Help me receive and reflect this love.',
  abideApplication: 'Show sacrificial love to someone this week.',
  abideTags: 'love, salvation',
  strongsIds: 'G25',
  isPublic: false,
  journalEntryId: 12,
};

const allText = (tree: ReactTestRenderer) =>
  tree.root
    .findAll((node: any) => node.type === 'Text')
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string')
    .join('|');

const pressByLabel = async (tree: ReactTestRenderer, label: string) => {
  const control = tree.root.findByProps({ accessibilityLabel: label });
  await act(async () => {
    control.props.onPress();
    await Promise.resolve();
  });
};

describe('LabStudiesSection', () => {
  beforeEach(() => {
    mockedSendPostRequest.mockReset();
    mockedSendPostRequest.mockImplementation(
      async (_controller: string, request: string) => {
        if (request === 'history') {
          return {
            returnCode: 200,
            returnMessage: 'Session history',
            returnData: { data: [summary] },
          };
        }
        return {
          returnCode: 200,
          returnMessage: 'Session found',
          returnData: detail,
        };
      },
    );
  });

  it('loads a complete study and reveals each stage inline', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <LabStudiesSection
          bookName="John"
          chapter={3}
          verse={16}
          colors={colors}
        />,
      );
      await Promise.resolve();
    });

    expect(allText(tree)).toContain('YOUR LAB STUDIES');

    await pressByLabel(tree, 'John 3:16, Completed');
    expect(mockedSendPostRequest).toHaveBeenCalledWith(
      'exegesis',
      'session-1',
      {},
    );

    await pressByLabel(tree, 'Look, completed');
    expect(allText(tree)).toContain('God loved the world and gave his Son.');
    expect(allText(tree)).toContain('What words stand out?');

    await pressByLabel(tree, 'Apply, completed');
    const text = allText(tree);
    expect(text).not.toContain('God loved the world and gave his Son.');
    expect(text).toContain('Show sacrificial love to someone this week.');
    expect(text).toContain('This study was saved to your Legacy Ledger.');
  });
});
