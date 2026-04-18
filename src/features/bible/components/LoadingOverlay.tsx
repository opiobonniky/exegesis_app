import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getColors, FONT_SIZES } from '../../../constants/theme';
import { LoadingOverlayProps } from '../types';

export default function LoadingOverlay({
  visible,
  message,
  isDark,
}: LoadingOverlayProps) {
  if (!visible) return null;

  const COLORS = getColors(isDark);

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && (
        <Text
          style={[
            styles.message,
            {
              color: COLORS.white,
              fontSize: FONT_SIZES.sm,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  message: {
    marginTop: 12,
  },
});
