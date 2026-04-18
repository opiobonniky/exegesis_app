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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppContext } from '../../common/AppContext';
import { getColors, SPACING } from '../../constants/theme';
import logo from '../../assets/logos/exegesis_bg_rm.png';

const { width } = Dimensions.get('window');
const BOTTOM_SPACING = Platform.OS === 'ios' ? 40 : 24;

// small helper
const withAlpha = (hex: string, alpha: number) => {
  // hex: #RRGGBB
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
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

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

  // ✅ Slides built from theme colors
  const slides = useMemo(
    () => [
      {
        id: 1,
        title: 'Your Daily',
        subtitle: 'Biblical Study',
        text: 'Begin each day with scripture reading, verse analysis, and deep biblical interpretation.',
        gradientColors: [COLORS.accent + '20', COLORS.text], // ✅ theme gradient
        icon: logo,
        features: ['Daily Scripture', 'Verse Analysis', 'Study Insights'],
        layout: 'top' as const,
        accent: COLORS.accent,
      },
      {
        id: 2,
        title: 'Interpret',
        subtitle: 'Scripture',
        text: "Compare translations, analyze context, and uncover the deeper exegetical meaning of God's word.",
        // ✅ theme gradient but slightly "warmer"
        gradientColors: [COLORS.primary, COLORS.primaryLight],
        icon: '🔍',
        features: [
          'Translation Comparison',
          'Contextual Analysis',
          'Exegetical Tools',
        ],
        layout: 'center' as const,
        accent: COLORS.accent,
      },
      {
        id: 3,
        title: 'Study',
        subtitle: 'Deeply',
        text: 'Save your insights, create study notes, and engage in meaningful biblical interpretation with fellow believers.',
        // ✅ dark theme: richer; light theme: primary→accent blend
        gradientColors: isDark
          ? [COLORS.headgradient[0], COLORS.primaryDark]
          : [COLORS.primary, COLORS.accent],
        icon: '📖',
        features: ['Study Notes', 'Verse Analysis', 'Interpretation Tools'],
        layout: 'bottom' as const,
        accent: COLORS.accent,
      },
    ],
    [COLORS, isDark],
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
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, []);

  const floatingTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const textOnGradient = '#FFFFFF';
  const softWhite = 'rgba(255,255,255,0.88)';
  const glass = withAlpha(COLORS.white, 0.18);
  const glass2 = withAlpha(COLORS.white, 0.26);

  const renderSlide = (slide: (typeof slides)[0]) => {
    if (slide.layout === 'top') {
      return (
        <View key={slide.id} style={styles.slide}>
          <View style={styles.topLayout}>
            <Animated.View
              style={[{ transform: [{ translateY: floatingTranslate }] }]}
            >
              {typeof slide.icon === 'number' ? (
                <Image source={slide.icon} style={styles.logoImage} />
              ) : (
                <Text style={styles.iconLarge}>{slide.icon}</Text>
              )}
            </Animated.View>

            <Text style={[styles.titleLarge, { color: softWhite }]}>
              {slide.title}
            </Text>
            <Text style={[styles.subtitleLarge, { color: textOnGradient }]}>
              {slide.subtitle}
            </Text>
            <Text style={[styles.descriptionLarge, { color: softWhite }]}>
              {slide.text}
            </Text>

            <View style={styles.featuresGrid}>
              {slide.features.map((f, i) => (
                <View
                  key={i}
                  style={[styles.featureCard, { backgroundColor: glass }]}
                >
                  <View
                    style={[
                      styles.featureIconCircle,
                      { backgroundColor: glass2 },
                    ]}
                  >
                    <Text
                      style={[styles.featureNumber, { color: textOnGradient }]}
                    >
                      {i + 1}
                    </Text>
                  </View>
                  <Text
                    style={[styles.featureCardText, { color: textOnGradient }]}
                  >
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    }

    if (slide.layout === 'center') {
      return (
        <View key={slide.id} style={styles.slide}>
          <View style={styles.centerLayout}>
            <Animated.View
              style={[
                styles.iconWrapperMedium,
                { transform: [{ translateY: floatingTranslate }] },
              ]}
            >
              <Text style={styles.iconMedium}>{slide.icon}</Text>
            </Animated.View>

            <View style={styles.textBlock}>
              <Text style={[styles.titleMedium, { color: softWhite }]}>
                {slide.title}
              </Text>
              <Text style={[styles.subtitleMedium, { color: textOnGradient }]}>
                {slide.subtitle}
              </Text>
            </View>

            <Text style={[styles.descriptionMedium, { color: softWhite }]}>
              {slide.text}
            </Text>

            <View style={styles.featuresList}>
              {slide.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View
                    style={[styles.featureBullet, { backgroundColor: glass2 }]}
                  >
                    <View
                      style={[
                        styles.bulletDot,
                        { backgroundColor: textOnGradient },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.featureRowText, { color: textOnGradient }]}
                  >
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    }

    // bottom
    return (
      <View key={slide.id} style={styles.slide}>
        <View style={styles.bottomLayout}>
          <View style={styles.topContent}>
            <Text style={[styles.titleSmall, { color: softWhite }]}>
              {slide.title}
            </Text>
            <Text style={[styles.subtitleSmall, { color: textOnGradient }]}>
              {slide.subtitle}
            </Text>
            <Text style={[styles.descriptionSmall, { color: softWhite }]}>
              {slide.text}
            </Text>

            <View style={styles.featuresTags}>
              {slide.features.map((f, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureTag,
                    {
                      backgroundColor: glass2,
                      borderColor: withAlpha(COLORS.white, 0.22),
                    },
                  ]}
                >
                  <Text
                    style={[styles.featureTagText, { color: textOnGradient }]}
                  >
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Animated.View
            style={[
              styles.iconWrapperBottom,
              { transform: [{ translateY: floatingTranslate }] },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: glass,
                  borderColor: withAlpha(COLORS.white, 0.25),
                },
              ]}
            >
              <Text style={styles.iconBottom}>{slide.icon}</Text>
            </View>
          </Animated.View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* Background gradients */}
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
          </Animated.View>
        );
      })}

      {/* Skip Button */}
      <Animated.View style={[styles.skipContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[
            styles.skipBtn,
            {
              backgroundColor: withAlpha(COLORS.white, 0.22),
              borderColor: withAlpha(COLORS.white, 0.25),
            },
          ]}
          onPress={handleGetStarted}
        >
          <Text style={[styles.skipText, { color: '#fff' }]}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Slides */}
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

      {/* Pagination Dots */}
      <Animated.View style={[styles.pagination, { opacity: fadeAnim }]}>
        {slides.map((_, index) => {
          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ],
            outputRange: [0.25, 1, 0.25],
            extrapolate: 'clamp',
          });

          const dotScale = scrollX.interpolate({
            inputRange: [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ],
            outputRange: [1, 1.35, 1],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: dotOpacity,
                  transform: [{ scale: dotScale }],
                  backgroundColor: withAlpha(COLORS.white, 0.95),
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Bottom CTA */}
      <Animated.View
        style={[
          styles.bottom,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          style={styles.cta}
          onPress={
            currentIndex === slides.length - 1
              ? handleGetStarted
              : handleContinue
          }
          activeOpacity={0.85}
        >
          <LinearGradient
            // ✅ themed CTA: accent → accentLight
            colors={[COLORS.accent, COLORS.accentLight]}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.ctaText, { color: COLORS.primaryDark }]}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  slide: {
    width,
    paddingHorizontal: 32,
    paddingBottom: 160,
    justifyContent: 'center',
    flex: 1,
  },

  // TOP
  topLayout: { alignItems: 'center', paddingTop: 80 },
  iconLarge: { fontSize: 80 },
  logoImage: { width: 250, height: 250, resizeMode: 'contain' },
  titleLarge: { fontSize: 26, fontWeight: '600', letterSpacing: 1 },
  subtitleLarge: {
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
  },
  descriptionLarge: {
    opacity: 0.95,
    textAlign: 'center',
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 23,
    paddingHorizontal: 8,
  },
  featuresGrid: { width: '100%', gap: 12 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  featureIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureNumber: { fontSize: 14, fontWeight: '700' },
  featureCardText: { fontSize: 15, fontWeight: '600' },

  // CENTER
  centerLayout: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  iconWrapperMedium: { marginBottom: 36 },
  iconMedium: { fontSize: 72 },
  textBlock: { alignItems: 'center', marginBottom: 24 },
  titleMedium: { fontSize: 24, fontWeight: '500', opacity: 0.9 },
  subtitleMedium: { fontSize: 40, fontWeight: '800', textAlign: 'center' },
  descriptionMedium: {
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  featuresList: { width: '100%', gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start' },
  featureBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  bulletDot: { width: 8, height: 8, borderRadius: 4 },
  featureRowText: { fontSize: 15, flex: 1, lineHeight: 23 },

  // BOTTOM
  bottomLayout: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 40,
  },
  topContent: { alignItems: 'flex-start' },
  titleSmall: { fontSize: 22, fontWeight: '600' },
  subtitleSmall: { fontSize: 38, fontWeight: '900', marginBottom: 18 },
  descriptionSmall: {
    opacity: 0.9,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  featuresTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureTagText: { fontSize: 13, fontWeight: '600' },
  iconWrapperBottom: { alignSelf: 'center' },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  iconBottom: { fontSize: 64 },

  // Skip
  skipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    right: 24,
    zIndex: 50,
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipText: { fontWeight: '700', fontSize: 15 },

  // Dots
  pagination: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // CTA
  bottom: {
    position: 'absolute',
    bottom: BOTTOM_SPACING,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    zIndex: 20,
  },
  cta: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: { paddingVertical: 18, borderRadius: 16 },
  ctaText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
