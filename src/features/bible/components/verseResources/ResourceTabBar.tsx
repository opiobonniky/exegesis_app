import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../../../constants/theme';
import type { ResourceTab } from './constants';

export function ResourceTabBar({
  tabs,
  activeTab,
  onTabChange,
  visibleTabs,
  colors,
  isRtl,
}: {
  tabs: ResourceTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  visibleTabs: string[];
  colors: any;
  isRtl: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);

  const filteredTabs = tabs.filter((t) => visibleTabs.includes(t.key));

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: isRtl ? 'row-reverse' : 'row',
        gap: 8,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
      }}
      style={{ marginBottom: SPACING.sm }}
    >
      {filteredTabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onTabChange(tab.key)}
            style={[
              tabStyles.pill,
              isActive
                ? [tabStyles.pillActive, { backgroundColor: tab.color, borderColor: tab.color }]
                : [tabStyles.pillInactive, { borderColor: colors.border, backgroundColor: colors.surface }],
            ]}
          >
            {React.cloneElement(tab.icon as React.ReactElement, {
              color: isActive ? '#FFFFFF' : tab.color,
              size: 14,
              strokeWidth: 2.2,
            })}
            <Text style={[tabStyles.pillText, { color: isActive ? '#FFFFFF' : colors.text }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const tabStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  pillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  pillInactive: {},
  pillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
