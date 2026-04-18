import * as React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { AppContext } from '../common/AppContext';
import { createThemeStyles, getColors } from '../constants/theme';

type ButtonVariant = 'primary' | 'outline' | 'secondary';
type ButtonSize = 'small' | 'medium' | 'large';

type Props = {
  title: string;
  onPress: () => void;
  style?: any;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const PrimaryButton = ({
  title,
  onPress,
  style,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
}: Props) => {
  // ✅ Hooks at top level
  const app = React.useContext(AppContext);
  if (!app) return null;

  // ✅ Create theme once
  const COLORS = React.useMemo(() => getColors(app.isDark), [app.isDark]);
  const themeStyle: any = React.useMemo(
    () => createThemeStyles(COLORS),
    [COLORS],
  );

  const getButtonStyle = () => {
    const baseStyle = [themeStyle.button];

    // Size
    if (size === 'small') baseStyle.push(themeStyle.buttonSmall);
    if (size === 'large') baseStyle.push(themeStyle.buttonLarge);

    // Variant
    if (variant === 'outline') {
      baseStyle.push(themeStyle.buttonOutline);
    }

    if (variant === 'secondary') {
      baseStyle.push({
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
      });
    }

    // State
    if (disabled || loading) baseStyle.push(themeStyle.buttonDisabled);

    return baseStyle;
  };

  const getTextStyle = () =>
    variant === 'outline'
      ? themeStyle.buttonTextOutline
      : themeStyle.buttonText;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[...getButtonStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? COLORS.primary : COLORS.white}
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
