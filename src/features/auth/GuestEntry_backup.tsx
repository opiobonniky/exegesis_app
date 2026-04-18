/**
 * GuestEntry.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modern auth hub for unauthenticated users with clean design and smooth animations.
 *
 * Features:
 * - Clean gradient background with subtle animated particles
 * - Minimalist logo section with tagline
 * - Horizontal scrolling feature showcase
 * - Prominent CTAs with clear hierarchy
 * - Smooth entrance animations
 */

import React, { useContext, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  LogIn,
  UserPlus,
  Highlighter,
  Headphones,
  CalendarClock,
  Sparkles,
  BookMarked,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';

import { AppContext } from '../../common/AppContext';
import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../../constants/theme';
import { route } from '../../component/navigations/routes';

const { width } = Dimensions.get('window');
const LOGO_SIZE = Math.min(width * 0.4, 180);

const logo = require('../../assets/logos/exegesis-logo.png');

const FEATURES = [
  { icon: TrendingUp, label: '5+ Translations', color: '#4A80D4' },
  { icon: Headphones, label: 'Audio Narration', color: '#8B5CF6' },
  { icon: Highlighter, label: 'Highlights', color: '#F59E0B' },
  { icon: BookMarked, label: 'Notes & Favorites', color: '#10B981' },
  { icon: CalendarClock, label: 'Reading Plans', color: '#3B82F6' },
  { icon: Sparkles, label: 'Verse Explanations', color: '#EC4899' },
];

const BACKGROUND_COLORS = ['#0f2744', '#1a4373'];

export default function GuestEntry() {
  const navigation = useNavigation<any>();
  const app = useContext(AppContext);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const btnSlide = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.spring(btnSlide, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim, cardSlide, btnSlide]);

  if (!app) return null;
    root: {
      flex: 1,
      backgroundColor: BACKGROUND_COLORS[0],
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 40,
      alignItems: 'center',
    },
    // Decorative elements
    decorCircle: {
      position: 'absolute',
      borderRadius: 999,
    },
    decorTopRight: {
      width: 300,
      height: 300,
      backgroundColor: 'rgba(89, 133, 196, 0.1)',
      top: -100,
      right: -100,
    },
    decorBottomLeft: {
      width: 200,
      height: 200,
      backgroundColor: 'rgba(240, 180, 41, 0.05)',
      bottom: 60,
      left: -60,
    },
    // Logo section
    logoSection: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
      width: '100%',
    },
    logoContainer: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: LOGO_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 8,
    },
    logo: {
      width: LOGO_SIZE * 0.85,
      height: LOGO_SIZE * 0.85,
    },
    appName: {
      fontSize: FONT_SIZES.huge,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 1.5,
      marginBottom: 4,
      textAlign: 'center',
    },
    tagline: {
      fontSize: FONT_SIZES.sm,
      color: 'rgba(255, 255, 255, 0.6)',
      fontStyle: 'italic',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    // Features card
    featuresCard: {
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      padding: SPACING.lg,
      marginBottom: SPACING.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    featuresTitle: {
      fontSize: FONT_SIZES.md,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.75)',
      textAlign: 'center',
      marginBottom: SPACING.lg,
      lineHeight: 22,
    },
    featuresContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: 120,
    },
    featuresScroll: {
      flex: 1,
    },
    featureItem: {
      width: 100,
      marginRight: SPACING.md,
      alignItems: 'center',
    },
    featureIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    featureText: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.85)',
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 14,
    },
    // Buttons section
    buttonsSection: {
      width: '100%',
      gap: SPACING.md,
    },
    primaryButton: {
      borderRadius: BORDER_RADIUS.lg,
      overflow: 'hidden',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    primaryButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    },
    primaryIconBox: {
      width: 48,
      height: 48,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: 'rgba(15, 39, 68, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryTextBox: {
      flex: 1,
    },
    primaryTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '800',
      color: '#0f2744',
      marginBottom: 2,
    },
    primarySubtitle: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(15, 39, 68, 0.6)',
      fontWeight: '500',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginVertical: SPACING.xs,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    dividerText: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.4)',
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: 15,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.25)',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    secondaryText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: '#fff',
    },
    tertiaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: 15,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(240, 180, 41, 0.35)',
      backgroundColor: 'rgba(240, 180, 41, 0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    tertiaryText: {
      fontSize: FONT_SIZES.md,
      fontWeight: '700',
      color: '#F0B429',
    },
    termsText: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(255, 255, 255, 0.35)',
      textAlign: 'center',
      lineHeight: 18,
      marginTop: SPACING.sm,
    },
    termsLink: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={BACKGROUND_COLORS}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorTopRight]} />
      <View style={[styles.decorCircle, styles.decorBottomLeft]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>EXEGESIS</Text>
          <Text style={styles.tagline}>Your Daily Spiritual Companion</Text>
        </Animated.View>

        {/* Features Card */}
        <Animated.View
          style={[
            styles.featuresCard,
            { opacity: fadeAnim, transform: [{ translateY: cardSlide }] },
          ]}
        >
          <Text style={styles.featuresTitle}>
            Everything you need to study the Word
          </Text>
          <View style={styles.featuresContainer}>
            <ScrollView
              style={styles.featuresScroll}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: SPACING.lg }}
            >
              {FEATURES.map(({ icon: Icon, label, color }) => (
                <View key={label} style={styles.featureItem}>
                  <View
                    style={[
                      styles.featureIconWrap,
                      { backgroundColor: color + '40' },
                    ]}
                  >
                    <Icon size={18} color={color} strokeWidth={2} />
                  </View>
                  <Text style={styles.featureText}>{label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.buttonsSection,
            { opacity: fadeAnim, transform: [{ translateY: btnSlide }] },
          ]}
        >
          {/* Primary CTA - Read the Bible */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGuest}
            activeOpacity={0.85}
          >
            <View style={styles.primaryButtonContent}>
              <View style={styles.primaryIconBox}>
                <BookOpen size={22} color="#0f2744" strokeWidth={2.5} />
              </View>
              <View style={styles.primaryTextBox}>
                <Text style={styles.primaryTitle}>Read the Bible</Text>
                <Text style={styles.primarySubtitle}>
                  No account needed • All 66 books
                </Text>
              </View>
              <ChevronRight size={24} color="#0f2744" />
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <LogIn size={20} color="#fff" strokeWidth={2} />
            <Text style={styles.secondaryText}>Sign In to Your Account</Text>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.tertiaryButton}
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <UserPlus size={20} color="#F0B429" strokeWidth={2} />
            <Text style={styles.tertiaryText}>Create a Free Account</Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            By continuing you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
