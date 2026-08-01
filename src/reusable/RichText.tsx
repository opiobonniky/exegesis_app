import React, { ReactNode } from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';

/**
 * RichText — renders the AI template engine's rich answer format (React Native).
 *
 * The backend answers use lightweight markers:
 *   ## Section headings      ### Sub-headings
 *   **bold lead-ins**        *italic quoted phrases*
 *   • bullet list items      1. numbered list items
 *   \n line breaks           \n\n paragraph breaks
 *
 * Instead of dumping raw `**`/`##` markers into plain text, this component
 * parses them into real nested <Text> nodes (React Native has no innerHTML,
 * so every token is inherently XSS-safe).
 */

interface RichTextProps {
  text: string;
  /** Base style applied to body paragraphs & list items. */
  textStyle?: StyleProp<TextStyle>;
  /** Extra style for headings (combined with textStyle + accentColor). */
  headingStyle?: StyleProp<TextStyle>;
  /** Color used for heading text (defaults to inherited color). */
  accentColor?: string;
  /** Color used for bullet markers (defaults to accentColor). */
  markerColor?: string;
  /** Spacing between block groups (paragraphs/lists/headings). */
  paragraphGap?: number;
  /** True to merge single newlines inside a paragraph into spaces. */
  softWrap?: boolean;
}

/** Render one line, splitting out **bold** and *italic* tokens. */
function renderInline(line: string, keyPrefix: string, baseStyle: StyleProp<TextStyle>): ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <Text key={key} style={[baseStyle, { fontWeight: '700' }]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <Text key={key} style={[baseStyle, { fontStyle: 'italic' }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part ? <Text key={key} style={baseStyle}>{part}</Text> : null;
  });
}

export default function RichText({
  text,
  textStyle,
  headingStyle,
  accentColor,
  markerColor,
  paragraphGap = 10,
  softWrap = false,
}: RichTextProps) {
  const content = String(text ?? '').trim();
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let keyCounter = 0;
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    const pKey = keyCounter++;
    const joined = softWrap
      ? para.map(l => l.trim()).filter(Boolean).join(' ')
      : para.join('\n');
    nodes.push(
      <Text key={`p-${pKey}`} style={[textStyle, { marginBottom: paragraphGap }]}>
        {renderInline(joined, `p-${pKey}`, textStyle)}
      </Text>,
    );
    para = [];
  };

  const flushList = () => {
    if (!list) return;
    const lKey = keyCounter++;
    const isUl = list.type === 'ul';
    nodes.push(
      <View key={`l-${lKey}`} style={{ marginBottom: paragraphGap }}>
        {list.items.map((item, i) => (
          <View
            key={`${lKey}-${i}`}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: 4,
            }}
          >
            <Text
              style={[
                textStyle,
                {
                  color: markerColor || accentColor,
                  fontWeight: '700',
                  minWidth: 18,
                  marginRight: 6,
                },
              ]}
            >
              {isUl ? '•' : `${i + 1}.`}
            </Text>
            <Text style={[textStyle, { flex: 1 }]}>
              {renderInline(item, `${lKey}-${i}`, textStyle)}
            </Text>
          </View>
        ))}
      </View>,
    );
    list = null;
  };

  const flushAll = () => {
    flushList();
    flushPara();
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Heading: "## Introduction" / "### Sub-heading"
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushAll();
      const hKey = keyCounter++;
      nodes.push(
        <Text
          key={`h-${hKey}`}
          style={[
            textStyle,
            { fontWeight: '800' },
            headingStyle,
            accentColor ? { color: accentColor } : null,
            { marginBottom: 4, marginTop: 4 },
          ]}
        >
          {renderInline(heading[2], `h-${hKey}`, textStyle)}
        </Text>,
      );
      continue;
    }

    // Bullet item: "• text" or "- text"
    const bullet = trimmed.match(/^[•\-\u2022]\s+(.+)$/);
    if (bullet) {
      flushPara();
      if (list?.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    // Numbered item: "1. text"
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) {
      flushPara();
      if (list?.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(numbered[2]);
      continue;
    }

    // Blank line closes lists and separates paragraphs
    if (trimmed === '') {
      flushAll();
      continue;
    }

    // Regular text line
    flushList();
    para.push(rawLine);
  }
  flushAll();

  return <View>{nodes}</View>;
}

// Re-export for tree-shaking friendliness
export { renderInline };
