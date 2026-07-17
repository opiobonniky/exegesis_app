import * as React from 'react';
import { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING } from '../../constants/theme';
import logo from '../../assets/logos/exegesis_bg_rm.png';
import {
  BookOpen,
  Hash,
  Beaker,
  BookText,
} from 'lucide-react-native';
import { PrimaryButton } from '../../reusable/PrimaryButton';
import { useLanguage } from '../../component/language-translation/LanguageProvider';

const { width, height } = Dimensions.get('window');
const BOTTOM_SPACING = Platform.OS === 'ios' ? 40 : 24;

const withAlpha = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const Welcome = () => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const { translations: t } = useLanguage();
  const appContext = React.useContext(AppContext);

  if (!appContext) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const { markLaunched, isDark } = appContext;
  const COLORS = getColors(isDark);

  const slides = useMemo(
    () => [
      {
        id: 1,
        title: '',
        highlight: t?.onboarding?.slide1Highlight || 'The Word',
        text: t?.onboarding?.slide1Text || 'Read the Bible in a clean, distraction-free space.',
        gradientColors: isDark
          ? ['#0F172A', '#1E293B']
          : ['#F8FAFC', '#E2E8F0'],
        icon: <BookOpen size={64} color={COLORS.accent} strokeWidth={1.5} />,
        features: [
          t?.onboarding?.slide1Feature1 || '8 Bible Translations',
          t?.onboarding?.slide1Feature2 || 'Verse Highlights',
          t?.onboarding?.slide1Feature3 || 'Audio Narration',
        ],
        accent: COLORS.accent,
      },
      {
        id: 2,
        title: '',
        highlight: t?.onboarding?.slide2Highlight || 'The Tools',
        text: t?.onboarding?.slide2Text || 'Tap verses and words to discover context, Strong\'s definitions, and study helps.',
        gradientColors: isDark
          ? ['#1E1B4B', '#312E81']
          : ['#EEF2FF', '#E0E7FF'],
        icon: <Hash size={64} color={COLORS.accent} strokeWidth={1.5} />,
        features: [
          t?.onboarding?.slide2Feature1 || 'Strong\'s Concordance',
          t?.onboarding?.slide2Feature2 || 'Verse Side Menu',
          t?.onboarding?.slide2Feature3 || 'Cross References',
        ],
        accent: COLORS.accent,
      },
      {
        id: 3,
        title: '',
        highlight: t?.onboarding?.slide3Highlight || 'The Lab',
        text: t?.onboarding?.slide3Text || 'Learn to study through Look, Listen, Learn, and Abide.',
        gradientColors: isDark
          ? ['#134E4A', '#115E59']
          : ['#F0FDFA', '#CCFBF1'],
        icon: (
          <Beaker size={64} color={COLORS.accent} strokeWidth={1.5} />
        ),
        features: [
          t?.onboarding?.slide3Feature1 || 'Guided Observation',
          t?.onboarding?.slide3Feature2 || 'Dwell Timer',
          t?.onboarding?.slide3Feature3 || 'Study Tabs',
        ],
        accent: COLORS.accent,
      },
      {
        id: 4,
        title: '',
        highlight: t?.onboarding?.slide4Highlight || 'The Legacy Ledger',
        text: t?.onboarding?.slide4Text || 'Save your reflections, prayers, and studies into your private journal.',
        gradientColors: isDark
          ? ['#3B0764', '#581C87']
          : ['#FAF5FF', '#F3E8FF'],
        icon: (
          <BookText size={64} color={COLORS.accent} strokeWidth={1.5} />
        ),
        features: [
          t?.onboarding?.slide4Feature1 || 'Private Journal',
          t?.onboarding?.slide4Feature2 || 'Bulk Export',
          t?.onboarding?.slide4Feature3 || 'Community Discover',
        ],
        accent: COLORS.accent,
      },
    ],
    [COLORS, isDark, t],
  );

  const handleGetStarted = () => markLaunched();

  const handleContinue = () => {
    scrollRef.current?.scrollTo({
      x: width * (currentIndex + 1),
      animated: true,
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const floatingTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const renderSlide = (slide: (typeof slides)[0]) => {
    return (
      <View key={slide.id} style={styles.slide}>
        <View style={styles.slideContent}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.03)',
                transform: [{ translateY: floatingTranslate }],
              },
            ]}
          >
            {slide.id === 1 ? (
              <Image source={logo} style={styles.logoImage} />
            ) : (
              slide.icon
            )}
          </Animated.View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              {slide.title}
            </Text>
            <Text style={[styles.highlight, { color: COLORS.accent }]}>
              {slide.highlight}
            </Text>
            <Text style={[styles.description, { color: COLORS.muted }]}>
              {slide.text}
            </Text>
          </View>

          <View style={styles.featuresContainer}>
            {slide.features.map((feature, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.featureBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.04)',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Text style={[styles.featureText, { color: COLORS.accent }]}>
                  {feature}
                </Text>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      {/* Modern Background Gradients */}
      {slides.map((slide, index) => {
        const opacity = scrollX.interpolate({
          inputRange: [(index - 1) * width, index * width, (index + 1) * width],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={slide.id}
            style={[StyleSheet.absoluteFillObject, { opacity }]}
          >
            <LinearGradient
              colors={slide.gradientColors}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Decorative Ambient Orbs */}
            <View
              style={[
                styles.orb,
                {
                  backgroundColor: slide.accent,
                  top: -100,
                  right: -100,
                  opacity: isDark ? 0.15 : 0.08,
                },
              ]}
            />
            <View
              style={[
                styles.orb,
                {
                  backgroundColor: slide.accent,
                  bottom: -150,
                  left: -150,
                  opacity: isDark ? 0.1 : 0.05,
                },
              ]}
            />
          </Animated.View>
        );
      })}

      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Image source={logo} style={styles.headerLogo} />
        {/* Skip button only visible after first slide */}
        {currentIndex > 0 && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleGetStarted}>
            <Text style={[styles.skipText, { color: COLORS.muted }]}>{t?.onboarding?.skip || 'Skip'}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
            listener: handleScroll,
          },
        )}
        contentContainerStyle={styles.scrollContent}
      >
        {slides.map(s => renderSlide(s))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const widthAnim = scrollX.interpolate({
              inputRange: [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ],
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            const opacityAnim = scrollX.interpolate({
              inputRange: [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: widthAnim,
                    opacity: opacityAnim,
                    backgroundColor: COLORS.accent,
                  },
                ]}
              />
            );
          })}
        </View>

        <Animated.View
          style={[
            styles.ctaContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
        

          <PrimaryButton title={currentIndex === slides.length - 1
                  ? t?.onboarding?.getStarted || 'Get Started'
                  : t?.onboarding?.continueLabel || 'Continue'} style={[styles.cta, {backgroundColor: currentIndex % 2 === 0 ? COLORS.accent : COLORS.primary}]}
            onPress={
              currentIndex === slides.length - 1
                ? handleGetStarted
                : handleContinue
            }/>

          {/* "I already have an account" link — only on the first slide */}
         
        </Animated.View>
      </View>
    </View>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 100,
  },
  headerLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    opacity: 0.8,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    direction: 'ltr',
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 60,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  highlight: {
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: BOTTOM_SPACING,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaContainer: {
    width: '100%',
  },
  cta: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  loginLink: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    letterSpacing: 0.3,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
});
