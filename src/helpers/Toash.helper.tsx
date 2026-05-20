// Toast.helper.tsx
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Toast, { BaseToastProps } from 'react-native-toast-message';
import {
  CheckCircle,
  XCircle,
  Info as InfoIcon,
  AlertTriangle,
} from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export const showToast = (severity: ToastType, message: string) => {
  const topOffset = Platform.OS === 'ios' ? 84 : 56;
  Toast.show({
    type: severity,
    // Some platforms (iOS) require text1 to be present for a custom toast
    // to render text2 correctly. Provide an empty string when there's no
    // explicit title so rendering is consistent across platforms.
    text1: '',
    text2: message,
    position: 'top',
    visibilityTime: 2600,
    topOffset,
    bottomOffset: 40,
  });
};

function FancyToast(props: BaseToastProps & { variant: ToastType }) {
  const { text1, text2, variant } = props;

  const cfg =
    variant === 'success'
      ? {
          Icon: CheckCircle,
          icon: '#16A34A',

          // lighter modern surface
          bg: ['#ECFDF5', '#F0FDF4'],

          stroke: '#BBF7D0',
          chipBg: '#DCFCE7',
          chipText: '#166534',

          title: '#065F46',
          body: '#047857',

          label: 'SUCCESS',
        }
      : variant === 'error'
        ? {
            Icon: XCircle,
            icon: '#DC2626',

            bg: ['#FEF2F2', '#FFF1F2'],

            stroke: '#FECACA',
            chipBg: '#FEE2E2',
            chipText: '#991B1B',

            title: '#7F1D1D',
            body: '#B91C1C',

            label: 'ERROR',
          }
        : variant === 'warning'
          ? {
              Icon: AlertTriangle,
              icon: '#D97706',

              bg: ['#FFFBEB', '#FEFCE8'],

              stroke: '#FDE68A',
              chipBg: '#FEF3C7',
              chipText: '#92400E',

              title: '#78350F',
              body: '#B45309',

              label: 'WARNING',
            }
          : {
              Icon: InfoIcon,
              icon: '#2563EB',

              bg: ['#EFF6FF', '#F0F9FF'],

              stroke: '#BFDBFE',
              chipBg: '#DBEAFE',
              chipText: '#1E3A8A',

              title: '#1E3A8A',
              body: '#2563EB',

              label: 'INFO',
            };

  const Icon = cfg.Icon;

  return (
    <View style={S.wrap}>
      <View style={[S.cardContainer, { borderColor: cfg.stroke }]}> 
        {/* Gradient as background filling the container */}
        <LinearGradient
          colors={cfg.bg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.gradientFill}
        />

        {/* Foreground content */}
        <View style={S.cardContent}>
          <View style={[S.iconBox, { backgroundColor: cfg.chipBg }]}> 
            <Icon size={18} color={cfg.icon} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            {text1 ? (
              <Text
                style={[S.title, { color: cfg.title }]}
                numberOfLines={1}
                allowFontScaling
              >
                {text1}
              </Text>
            ) : null}

            <Text
              style={[S.body, { color: cfg.body ?? '#000' }]}
              numberOfLines={Platform.OS === 'ios' ? 4 : 2}
              allowFontScaling
            >
              {text2 ?? ''}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => (
    <FancyToast {...props} variant="success" />
  ),
  error: (props: BaseToastProps) => <FancyToast {...props} variant="error" />,
  info: (props: BaseToastProps) => <FancyToast {...props} variant="info" />,
  warning: (props: BaseToastProps) => (
    <FancyToast {...props} variant="warning" />
  ),
};

const S = StyleSheet.create({
  wrap: { paddingHorizontal: 14, width: '100%' },
  cardContainer: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 4 : 2,
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
    // ensure there's always a fallback background color under the gradient
    // (some iOS rendering quirk causes gradient clipping in rare cases)
    backgroundColor: '#ffffff00',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    position: 'relative',
    backgroundColor: 'transparent',
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: { marginBottom: 4 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 14, fontWeight: '900' },
  body: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 14,
  },
});
