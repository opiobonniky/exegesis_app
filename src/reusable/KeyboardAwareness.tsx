import React from 'react';
import {
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface KeyboardAwarenessProps {
  children: React.ReactNode;
  style?: ViewStyle;
  behavior?: 'padding' | 'height' | 'position';
  enabled?: boolean;
}

/**
 * KeyboardAwareness Component
 *
 * A wrapper component that handles keyboard dismissal and avoidance behavior.
 *
 * Features:
 * - Dismisses keyboard when tapping outside input fields
 * - Handles keyboard avoidance for iOS and Android
 * - Customizable behavior and styling
 *
 * Usage:
 * <KeyboardAwareness>
 *   <YourContent />
 * </KeyboardAwareness>
 */
const KeyboardAwareness: React.FC<KeyboardAwarenessProps> = ({
  children,
  style,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  enabled = true,
}) => {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      style={[styles.container, style]}
      enabled={enabled}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        {children}
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default KeyboardAwareness;
