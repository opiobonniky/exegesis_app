import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import BibleActionBar from '../src/features/bible/components/BibleActionBar';

describe('BibleActionBar', () => {
  it('exposes and runs all six reading actions', () => {
    const handlers = {
      onNote: jest.fn(),
      onBookmark: jest.fn(),
      onUndo: jest.fn(),
      onScrollTop: jest.fn(),
      onRedo: jest.fn(),
      onScrollBottom: jest.fn(),
    };
    let tree!: ReactTestRenderer;

    act(() => {
      tree = create(<BibleActionBar {...handlers} />);
    });

    const actions: Array<[string, jest.Mock]> = [
      ['Add note', handlers.onNote],
      ['Bookmark verse', handlers.onBookmark],
      ['Previous chapter', handlers.onUndo],
      ['Scroll to top', handlers.onScrollTop],
      ['Next chapter', handlers.onRedo],
      ['Scroll to bottom', handlers.onScrollBottom],
    ];

    actions.forEach(([label, handler]) => {
      const button = tree.root.findByProps({ accessibilityLabel: label });
      act(() => button.props.onPress());
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
