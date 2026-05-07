

import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LogIn, UserPlus, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { AppContext } from '../../common/AppContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { route } from '../../component/navigations/routes';

const APPEAR_DELAY = 1200;

interface GuestBannerProps {
  triggered?: boolean;
  triggerMessage?: string;
  onTriggeredDismiss?: () => void;
}

export default function GuestBanner({
  triggered = false,
  triggerMessage,
  onTriggeredDismiss,
}: GuestBannerProps) {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);

  // ── All hooks before any early return ─────────────────────────────────────
  const [autoDismissed, setAutoDismissed] = useState(false);
  const slideY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const userLoggedIn = !app?.userInfo;

  // Show if: triggered externally OR (auto-mode: guest + not dismissed)
  const shouldShow = triggered || (userLoggedIn && !autoDismissed);

  // ── Animation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldShow) {
      // snap hidden when nothing to show
      slideY.setValue(80);
      opacity.setValue(0);
      return;
    }

    const delay = triggered ? 0 : APPEAR_DELAY;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [shouldShow, triggered]);

  // ── Early returns AFTER all hooks ─────────────────────────────────────────
  if (!app) return null;
  if (!shouldShow) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: 80,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (triggered) {
        onTriggeredDismiss?.();
      } else {
        setAutoDismissed(true);
      }
    });
  };

  const goSignIn = () => {
    dismiss();
    navigation.navigate(route.login);
  };

  const goRegister = () => {
    dismiss();
    navigation.navigate(route.register);
  };

  // Contextual message: triggered message takes priority, fallback to default
  const message =
    triggerMessage ?? 'Sign in or register to save highlights, notes & history';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[s.wrapper, { opacity, transform: [{ translateY: slideY }] }]}
    >
      <LinearGradient
        colors={['#1E3A5F', '#2A5BA8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.banner}
      >
        {/* Text */}
        <View style={s.textCol}>
          <Text style={s.title}>
            {triggered ? '🔒 Sign In Required' : 'Reading as guest'}
          </Text>
          <Text style={s.sub}>{message}</Text>
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.signInBtn}
            onPress={goSignIn}
            activeOpacity={0.85}
          >
            <LogIn size={13} color="#fff" strokeWidth={2.3} />
            <Text style={s.signInTxt}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.registerBtn}
            onPress={goRegister}
            activeOpacity={0.85}
          >
            <UserPlus size={13} color="#F0B429" strokeWidth={2.3} />
            <Text style={s.registerTxt}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Dismiss */}
        <TouchableOpacity
          style={s.closeBtn}
          onPress={dismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={13} color="rgba(255,255,255,0.55)" strokeWidth={2.5} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const BOTTOM_TAB_HEIGHT = Platform.OS === 'ios' ? 82 : 62;

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: BOTTOM_TAB_HEIGHT + 8,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 200,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  textCol: { flex: 1 },
  title: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  sub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.60)',
    fontWeight: '500',
    lineHeight: 14,
  },
  actions: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  signInTxt: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#fff' },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(240,180,41,0.14)',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.38)',
  },
  registerTxt: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#F0B429' },
  closeBtn: { padding: 4 },
});
