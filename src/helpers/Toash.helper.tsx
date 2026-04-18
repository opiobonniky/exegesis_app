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
  Toast.show({
    type: severity,
    text1: undefined,
    text2: message,
    position: 'top',
    visibilityTime: 2600,
    topOffset: 56,
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
      <LinearGradient
        colors={cfg.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[S.card, { borderColor: cfg.stroke }]}
      >
        <View style={[S.iconBox, { backgroundColor: cfg.chipBg }]}>
          <Icon size={18} color={cfg.icon} />
        </View>

        <View style={{ flex: 1 }}>
          {text1 && (
            <Text style={[S.title, { color: cfg.title }]} numberOfLines={1}>
              {text1}
            </Text>
          )}

          <Text style={[S.body, { color: cfg.body }]} numberOfLines={2}>
            {text2 ?? ''}
          </Text>
        </View>
      </LinearGradient>
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
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 4 : 0,
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
