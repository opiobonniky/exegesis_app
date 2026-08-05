import React from 'react';
import { TouchableOpacity } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import StudyToolsList from '../src/features/strongs-dictionary/components/StudyToolsList';

jest.mock('../src/features/strongs-dictionary/components/StudyToolPanel', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ tool }: { tool: string }) => (
      <Text>{`PANEL_OPEN_${tool}`}</Text>
    ),
  };
});

const colors = {
  primary: '#2563EB',
  background: '#fff',
  text: '#000',
  textSecondary: '#666',
  muted: '#999',
};

/** All string leaf texts inside an instance (e.g. a tool row's title/subtitle). */
function texts(el: any): string[] {
  return el
    .findAll(
      (n: any) =>
        n.type === 'Text' && typeof n.props.children === 'string',
    )
    .map((n: any) => String(n.props.children));
}

function tapTool(tree: ReactTestRenderer, title: string) {
  const row = tree.root
    .findAll((el: any) => el.type === TouchableOpacity)
    .find((el: any) => texts(el).includes(title));
  expect(row).toBeTruthy();
  act(() => row!.props.onPress());
}

function panelText(tree: ReactTestRenderer) {
  return texts(tree.root).join('|');
}

describe('StudyToolsList accordion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the tapped tool inline and keeps only one open', () => {
    const tree = (() => {
      let t!: ReactTestRenderer;
      act(() => {
        t = create(
          <StudyToolsList
            bookName="Acts"
            chapter={15}
            verse={28}
            translationId="NKJV"
            isDark={false}
            colors={colors}
          />,
        );
      });
      return t;
    })();

    // Closed: no panel mounted.
    expect(panelText(tree)).not.toContain('PANEL_OPEN_');

    // Tap "Verse Explanation" — its panel mounts.
    tapTool(tree, 'Verse Explanation');
    expect(panelText(tree)).toContain('PANEL_OPEN_explanation');

    // Tap "Strong's Concordance" — it opens; advance timers so the
    // explanation panel's 220ms close animation finishes and unmounts it.
    tapTool(tree, "Strong's Concordance");
    act(() => {
      jest.advanceTimersByTime(500);
    });
    const after = panelText(tree);
    expect(after).toContain('PANEL_OPEN_strongs');
    expect(after).not.toContain('PANEL_OPEN_explanation');

    // Tap the same row again — collapses entirely.
    tapTool(tree, "Strong's Concordance");
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(panelText(tree)).not.toContain('PANEL_OPEN_');
  });
});
