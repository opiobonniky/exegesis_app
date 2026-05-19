import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { createThemeStyles, getColors } from '../constants/theme';
import { AppContext } from '../common/AppContext';

type Props = {
  placeholder: string;
  value?: string;
  onChangeText?: (v: string) => void;
  secure?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  error?: string;
  label?: string;
  disable?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  textAlign?: 'left' | 'right' | 'center';
};

export default function InputField({
  placeholder,
  value,
  onChangeText,
  secure = false,
  keyboardType,
  autoCapitalize,
  error,
  label,
  disable = false,
  leftIcon,
  rightIcon,
  textAlign = 'left',
  ...props
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secure;

  const { isDark }: any = React.useContext(AppContext);
  const COLORS: any = getColors(isDark);
  const themeStyle: any = createThemeStyles(COLORS);

  return (
    <View>
      {label && (
        <Text style={[themeStyle.bodyText, themeStyle.mb2, { marginLeft: 2 }]}>
          {label}
        </Text>
      )}

      {/* Input Wrapper */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: error ? COLORS.error : COLORS.border,
          borderRadius: 8,
          paddingLeft: leftIcon ? 12 : 0,
          paddingRight: isPassword || rightIcon ? 10 : 0,
        }}
      >
        {/* Left Icon */}
        {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}

        <TextInput
          style={{
            flex: 1,
            paddingHorizontal: leftIcon ? 0 : 12,
            paddingVertical: 12,
            color: COLORS.text,
            textAlign: textAlign,
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!disable}
          {...props}
        />

        {/* Right Icon or Eye Toggle */}
        {rightIcon ? (
          <View style={{ paddingHorizontal: 6 }}>{rightIcon}</View>
        ) : (
          isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={{ paddingHorizontal: 6 }}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOff size={20} color={COLORS.muted} />
              ) : (
                <Eye size={20} color={COLORS.muted} />
              )}
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Error */}
      {error && (
        <Text style={{ color: COLORS.error, marginTop: 4, fontSize: 12 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
