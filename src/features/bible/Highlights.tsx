import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Trash2 } from 'lucide-react-native';

import { sendPostRequest } from '../../services/api';
import { getVersesForChapter } from '../../utilits/bibleUtils';
import {
  SPACING,
  BORDER_RADIUS,
  getColors,
  createThemeStyles,
} from '../../constants/theme';
import { HIGHLIGHT_COLORS } from '../../utilits/HIGHLIGHT_COLORS';
import ActionHeader from '../../reusable/ActionHeader';
import { useNavigation } from '@react-navigation/native';
import ActionModal from '../../reusable/ActionModal';
import { AppContext } from '../../common/AppContext';

interface HighlightDto {
  id: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  colorId: number;
  note?: string;
}

interface GroupedHighlights {
  [book: string]: {
    [chapter: number]: HighlightDto[];
  };
}

export default function Highlights() {
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState<HighlightDto[]>([]);
  const [modal, setModal] = useState<any>({
    status: false,
    title: '',
    message: '',
    severity: 'info',
  });

  const { isDark }: any = useContext(AppContext) || {};

  const navigation = useNavigation<any>();
  const COLORS = getColors(isDark);
  const themeStyle = createThemeStyles(COLORS);

  useEffect(() => {
    loadHighlights();
  }, []);

  const loadHighlights = async () => {
    try {
      setLoading(true);
      const response = await sendPostRequest('bible', 'get-highlights', {});

      if (response.returnCode === 200 && response.returnData) {
        setHighlights(response.returnData.highlights);
      } else {
        setModal({
          status: true,
          title: 'Error',
          message: response.returnMessage || 'Failed to load highlights',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error(error);
      setModal({
        status: true,
        title: 'Error',
        message: 'Failed to load highlights',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo<GroupedHighlights>(() => {
    return highlights.reduce((acc, h) => {
      if (!acc[h.bookName]) acc[h.bookName] = {};
      if (!acc[h.bookName][h.chapter]) acc[h.bookName][h.chapter] = [];
      acc[h.bookName][h.chapter].push(h);
      return acc;
    }, {} as GroupedHighlights);
  }, [highlights]);

  const removeHighlight = async (highlightId: number) => {
    try {
      const response = await sendPostRequest('bible', 'delete-highlight', {
        highlightId,
      });
      if (response.returnCode === 200) {
        setHighlights(prev => prev.filter(h => h.id !== highlightId));
      } else {
        setModal({
          status: true,
          title: 'Error',
          message: response.returnMessage || 'Failed to remove highlight',
          severity: 'error',
        });
      }
    } catch (e) {
      setModal({
        status: true,
        title: 'Error',
        message: 'Failed to remove highlight',
        severity: 'error',
      });
    }
  };

  return (
    <View style={themeStyle.container}>
      <ActionHeader title="My Highlights" onPress={() => navigation.goBack()} />
      {loading ? (
        <View style={[themeStyle.center, { flex: 1, marginTop: SPACING.lg }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[themeStyle.mutedText, { marginTop: SPACING.md }]}>
            Loading highlights...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={themeStyle.scrollContainer}>
          {Object.keys(grouped).length === 0 && (
            <View style={[themeStyle.center, themeStyle.mt6]}>
              <BookOpen size={48} color={COLORS.muted} />
              <Text style={[themeStyle.headingText, themeStyle.mt3]}>
                No highlights yet
              </Text>
              <Text style={[themeStyle.mutedText, themeStyle.mt2]}>
                Highlight verses while reading the Bible
              </Text>
            </View>
          )}

          {Object.entries(grouped).map(([book, chapters]) => (
            <View key={book} style={themeStyle.mb6}>
              <Text style={[themeStyle.headingText, themeStyle.mb3]}>
                {book}
              </Text>

              {Object.entries(chapters).map(([chapter, verses]) => (
                <View key={chapter} style={themeStyle.mb4}>
                  <Text style={[themeStyle.subheadingText, themeStyle.mb2]}>
                    Chapter {chapter}
                  </Text>

                  {verses
                    .sort((a, b) => a.verseNumber - b.verseNumber)
                    .map(v => {
                      const verseText = getVersesForChapter(book, v.chapter)[
                        v.verseNumber
                      ];
                      const color = HIGHLIGHT_COLORS.find(
                        c => c.id === v.colorId,
                      )?.color;

                      return (
                        <View
                          key={v.id}
                          style={[
                            themeStyle.card,
                            themeStyle.mb3,
                            {
                              borderLeftWidth: 6,
                              borderLeftColor: color || COLORS.primary,
                            },
                          ]}
                        >
                          <View
                            style={[themeStyle.rowSpaceBetween, themeStyle.mb2]}
                          >
                            <Text style={themeStyle.captionText}>
                              {book} {v.chapter}:{v.verseNumber}
                            </Text>
                            <TouchableOpacity
                              onPress={() => removeHighlight(v.id)}
                            >
                              <Trash2 size={18} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>

                          <Text
                            style={[themeStyle.bodyText, { lineHeight: 24 }]}
                          >
                            {verseText}
                          </Text>

                          {v.note ? (
                            <View
                              style={{
                                marginTop: SPACING.sm,
                                padding: SPACING.sm,
                                borderRadius: BORDER_RADIUS.sm,
                                backgroundColor: COLORS.surface,
                              }}
                            >
                              <Text style={themeStyle.mutedText}>{v.note}</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                </View>
              ))}

              <ActionModal
                visible={modal.status}
                title={modal.title}
                message={modal.message}
                severity={modal.severity}
                onConfirm={() => setModal({ ...modal, status: false })}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
