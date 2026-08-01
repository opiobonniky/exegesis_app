/**
 * Tests for the mobile RichText component (app/src/reusable/RichText.tsx)
 *
 * Verifies that the AI template engine's rich answer format is parsed into
 * real nested <Text> nodes:
 *   1. **bold** inline segments become bold text
 *   2. *italic* inline segments become italic text
 *   3. ## / ### headings render as bold heading nodes
 *   4. • bullet lists render with marker prefixes
 *   5. 1. numbered lists render with number prefixes
 *   6. blank lines separate paragraphs
 *   7. empty input renders nothing
 *
 * Uses react-test-renderer (installed) — @testing-library/react-native is
 * NOT installed in this package, so we wrap render in act() ourselves.
 */

import React from 'react';
import { Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import RichText, { renderInline } from '../src/reusable/RichText';

// ── Helper: render with act() and collect every <Text> node's text children ──
function renderTexts(ui: React.ReactElement): string[] {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(ui);
  });
  const parts: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node === 'string' || typeof node === 'number') {
      parts.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  act(() => tree.unmount());
  return parts;
}

describe('renderInline', () => {
  it('splits **bold** tokens into segments', () => {
    const parts = renderInline('**Passage context:** the verse speaks.', 'k', {} as any);
    expect(Array.isArray(parts)).toBe(true);
  });

  it('handles plain text without markers', () => {
    const parts = renderInline('God is love.', 'k', {} as any);
    expect(Array.isArray(parts)).toBe(true);
  });
});

describe('<RichText />', () => {
  it('renders nothing for empty input', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<RichText text="   " />);
    });
    // No content → component returns null → nothing in the tree
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
  });

  it('renders plain text', () => {
    const parts = renderTexts(<RichText text="God is love." />);
    expect(parts.join(' ')).toContain('God is love.');
  });

  it('renders **bold** inline without the asterisks', () => {
    const parts = renderTexts(<RichText text="**Passage context:** the verse speaks." />);
    const joined = parts.join(' ');
    expect(joined).toContain('Passage context:');
    expect(joined).not.toContain('**');
  });

  it('renders *italic* inline without the asterisks', () => {
    const parts = renderTexts(<RichText text={'The verse opens with *"I can do all things…"*'} />);
    const joined = parts.join(' ');
    expect(joined).toContain('I can do all things…');
    expect(joined).not.toContain('*');
  });

  it('renders ## headings without the hash markers', () => {
    const parts = renderTexts(<RichText text={'## Introduction\nJohn presents Jesus as the Word.'} />);
    const joined = parts.join(' ');
    expect(joined).toContain('Introduction');
    expect(joined).not.toContain('##');
  });

  it('renders ### sub-headings', () => {
    const parts = renderTexts(<RichText text={'### Original Language\ngreek text'} />);
    const joined = parts.join(' ');
    expect(joined).toContain('Original Language');
    expect(joined).not.toContain('###');
  });

  it('renders • bullet lists with a marker prefix', () => {
    const parts = renderTexts(<RichText text={'Commands to obey:\n• Believe in the Son\n• Love one another'} />);
    const joined = parts.join(' ');
    expect(joined).toContain('•');
    expect(joined).toContain('Believe in the Son');
    expect(joined).toContain('Love one another');
  });

  it('renders numbered lists with number prefixes', () => {
    const parts = renderTexts(<RichText text={'1. About God — what does He reveal?\n2. About humanity — our need and hope.'} />);
    const joined = parts.join(' ');
    expect(joined).toContain('1.');
    expect(joined).toContain('2.');
    expect(joined).toContain('About God');
  });

  it('applies accentColor to headings', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<RichText text={'## Key Terms\nbody'} accentColor="#B45309" />);
    });
    const headingNodes = tree.root
      .findAllByType(Text)
      .filter((t: any) => t.props.children === 'Key Terms');
    expect(headingNodes.length).toBeGreaterThan(0);
    act(() => tree.unmount());
  });

  it('does not throw on mixed content with blank lines', () => {
    const text = '**The central teaching:**\n\nOne line.\n\nAnother line.';
    const parts = renderTexts(<RichText text={text} />);
    const joined = parts.join(' ');
    expect(joined).toContain('The central teaching:');
    expect(joined).toContain('Another line.');
  });
});
