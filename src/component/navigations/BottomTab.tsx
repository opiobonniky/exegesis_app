import React, { useContext, useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  Home,
  BookOpen,
  User,
  ShieldIcon,
  BookText,
  Lightbulb,
  Beaker,
} from 'lucide-react-native';
import { getColors } from '../../constants/theme';
import { AppContext } from '../../common/AppContext';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useLanguage, isRtlLanguage } from '../language-translation/LanguageProvider';
import { route } from './routes';

interface BottomTabProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isGuest?: boolean;
  onGuestTabPress?: () => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: any;
  onPress: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─────────────────────────────────────────────────────────────────────────────
// Layout geometry
//
//  ┌─────────────────────────────────────────────────────────┐  ← wrapper top
//  │  NOTCH_RISE px of transparent space  (pill lives here)  │
//  ├──────────╗                  ╔────────────────────────────┤  ← bar top
//  │          ║  notch cutout    ║                            │
//  │          ╚══════════════════╝                            │
//  │          icon+label row  (BAR_CONTENT_H)                 │
//  │          ios safe area padding                           │
//  └─────────────────────────────────────────────────────────┘  ← wrapper bottom
//
// The pill is centered vertically across [NOTCH_RISE + NOTCH_DIP].
// All inactive icons + labels sit inside BAR_CONTENT_H, vertically centered.
// ─────────────────────────────────────────────────────────────────────────────

const NOTCH_RISE      = 18;   // px pill protrudes ABOVE bar surface
const NOTCH_DIP       = 10;   // px notch dips BELOW bar surface
const NOTCH_TOTAL     = NOTCH_RISE + NOTCH_DIP; // total notch excursion
const NOTCH_WIDTH     = 56;   // horizontal width of cutout
const NOTCH_RADIUS    = 12;   // corner radius of cutout
const PILL_SIZE       = 44;   // diameter of floating pill
const BAR_CONTENT_H   = 56;   // bar height containing icon + label + ios pad
const IOS_PAD         = Platform.OS === 'ios' ? 16 : 0;
const ICON_SIZE       = 24;

// Total height the wrapper must occupy:
//   transparent notch-rise area  +  bar content
const WRAPPER_H = NOTCH_RISE + BAR_CONTENT_H + IOS_PAD;

// ── SVG bar ───────────────────────────────────────────────────────────────────
// The SVG starts at y=NOTCH_RISE (the bar surface).
// It is drawn with the notch dipping downward from the bar top edge.
// Height of SVG = BAR_CONTENT_H + IOS_PAD.
function TabBarBackground({
  activeIndex,
  tabCount,
  barColor,
  width,
}: {
  activeIndex: number;
  tabCount: number;
  barColor: string;
  width: number;
}) {
  const animX = useRef(new Animated.Value(activeIndex)).current;
  const [cx, setCx] = useState(() => {
    const tw = width / tabCount;
    return tw * activeIndex + tw / 2;
  });

  useEffect(() => {
    Animated.spring(animX, {
      toValue: activeIndex,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [activeIndex]);

  useEffect(() => {
    const tw = width / tabCount;
    const id = animX.addListener(({ value }) => setCx(tw * value + tw / 2));
    return () => animX.removeListener(id);
  }, [width, tabCount]);

  // SVG coordinate system: (0,0) = bar top-left corner
  // notch dips DOWN by NOTCH_DIP from top edge
  const svgH = BAR_CONTENT_H + IOS_PAD;
  const nd   = NOTCH_DIP;
  const nw   = NOTCH_WIDTH;
  const nr   = NOTCH_RADIUS;
  const x1   = cx - nw / 2;
  const x2   = cx + nw / 2;

  const path = [
    `M 0 0`,
    `L ${x1 - nr} 0`,
    `Q ${x1} 0 ${x1} ${nr}`,          // top-left corner of notch
    `L ${x1} ${nd - nr}`,
    `Q ${x1} ${nd} ${x1 + nr} ${nd}`, // bottom-left corner of notch
    `L ${x2 - nr} ${nd}`,
    `Q ${x2} ${nd} ${x2} ${nd - nr}`, // bottom-right corner of notch
    `L ${x2} ${nr}`,
    `Q ${x2} 0 ${x2 + nr} 0`,         // top-right corner of notch
    `L ${width} 0`,
    `L ${width} ${svgH}`,
    `L 0 ${svgH}`,
    `Z`,
  ].join(' ');

  return (
    <Svg
      width={width}
      height={svgH}
      style={[StyleSheet.absoluteFill, { top: NOTCH_RISE }]}
      pointerEvents="none"
    >
      <Path d={path} fill={barColor} />
    </Svg>
  );
}

// ── Floating pill ─────────────────────────────────────────────────────────────
// Pill vertical center = NOTCH_RISE - NOTCH_DIP/2
// i.e. it straddles the bar top edge: rises NOTCH_RISE above, dips NOTCH_DIP/2 below
function NotchPill({
  activeIndex,
  tabCount,
  color,
  width,
  icon: Icon,
}: {
  activeIndex: number;
  tabCount: number;
  color: string;
  width: number;
  icon: any;
}) {
  const animX = useRef(new Animated.Value(activeIndex)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animX, {
        toValue: activeIndex,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.78, duration: 70, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 140, friction: 6 }),
      ]),
    ]).start();
  }, [activeIndex]);

  const tw = width / tabCount;
  const translateX = animX.interpolate({
    inputRange:  Array.from({ length: tabCount }, (_, i) => i),
    outputRange: Array.from({ length: tabCount }, (_, i) => i * tw + tw / 2 - PILL_SIZE / 2),
  });

  // Pill sits fully inside the bar, starting right at the bar surface
  const pillTopY = NOTCH_RISE;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pill,
        {
          backgroundColor: color,
          top: pillTopY,
          width: PILL_SIZE,
          height: PILL_SIZE,
          borderRadius: PILL_SIZE / 2,
          transform: [{ translateX }, { scale }],
        },
      ]}
    >
      <Icon size={ICON_SIZE} color="#FFF" strokeWidth={2.5} />
    </Animated.View>
  );
}

// ── BottomTab ─────────────────────────────────────────────────────────────────
export default function BottomTab({
  activeTab: manualActiveTab,
  setActiveTab,
  isGuest = false,
  onGuestTabPress,
}: BottomTabProps) {
  const app = useContext(AppContext);
  if (!app) return null;

  const { userInfo } = app;
  const isUserAdmin = (userInfo?.userRole ?? 0) === 1;
  const COLORS = useMemo(() => getColors(app.isDark), [app.isDark]);
  const navigation = useNavigation<any>();
  const { translations, language } = useLanguage();
  const isRtl = isRtlLanguage(language);

  const navigationState = useNavigationState(s => s);
  const currentRouteName = navigationState?.routes[navigationState.index]?.name;
  const [barWidth, setBarWidth] = useState(SCREEN_WIDTH);

  const activeTab = useMemo(() => {
    const map: Record<string, string> = {
      [route.home]: 'home',
      [route.bible]: 'bible',
      [route.favorites]: 'favorites',
      [route.readingPlan]: 'Plan',
      [route.profile]: 'profile',
      [route.legacyLedger]: 'ledger',
      [route.ledgerDetail]: 'ledger',
      [route.ledgerEntry]: 'ledger',
      [route.journal]: 'ledger',
      [route.lab]: 'lab',
      [route.labFlow]: 'lab',
      [route.adminDashboard]: 'adminDashboard',
      [route.adminUsers]: 'adminUsers',
      [route.adminDailyVerse]: 'adminVerse',
      [route.adminReadingPlans]: 'adminPlans',
      [route.adminJournalPrompts]: 'adminJournalPrompts',
      [route.adminJournalTemplates]: 'adminJournalTemplates',
    };
    return (currentRouteName ? map[currentRouteName] : null) ?? manualActiveTab ?? '';
  }, [manualActiveTab, currentRouteName]);

  const tabs: TabItem[] = isUserAdmin
    ? [
        { id: 'adminDashboard', label: translations?.bottomTab?.dashboard || 'Dashboard', icon: ShieldIcon, onPress: () => navigation.navigate(route.adminDashboard) },
        { id: 'adminUsers',     label: translations?.bottomTab?.users     || 'Users',     icon: User,       onPress: () => navigation.navigate(route.adminUsers) },
        { id: 'adminVerse',     label: translations?.bottomTab?.verse     || 'Verse',     icon: BookOpen,   onPress: () => navigation.navigate(route.adminDailyVerse) },
        { id: 'adminDevotion',  label: translations?.bottomTab?.devotion  || 'Devotion',  icon: Lightbulb,  onPress: () => navigation.navigate(route.adminDailyDevotion) },
      ]
    : [
        { id: 'home',   label: translations?.bottomTab?.home   || 'Home',   icon: Home,     onPress: () => navigation.navigate(route.home) },
        { id: 'bible',  label: translations?.bottomTab?.bible  || 'Bible',  icon: BookOpen, onPress: () => navigation.navigate(route.bible) },
        { id: 'lab',    label: translations?.bottomTab?.lab    || 'Lab',    icon: Beaker,   onPress: () => navigation.navigate(route.lab) },
        { id: 'ledger', label: translations?.bottomTab?.ledger || 'Ledger', icon: BookText, onPress: () => navigation.navigate(route.legacyLedger) },
      ];

  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === activeTab));
  const ActiveIcon  = tabs[activeIndex]?.icon ?? Home;
  const barColor    = app.isDark ? COLORS.cardBackground : '#FFFFFF';

  return (
    // NOTE: Home.tsx already wraps this in position:absolute bottom:0
    // so this component is NOT position:absolute itself.
    // It just needs the right height so the wrapper clips correctly.
    <View
      style={[styles.wrapper]}
      onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {/* SVG bar surface (starts at y=NOTCH_RISE inside wrapper) */}
      <TabBarBackground
        activeIndex={activeIndex}
        tabCount={tabs.length}
        barColor={barColor}
        width={barWidth}
      />

      {/* Floating pill (vertically straddles bar top edge) */}
      <NotchPill
        activeIndex={activeIndex}
        tabCount={tabs.length}
        color={COLORS.primary}
        width={barWidth}
        icon={ActiveIcon}
      />

      {/* ── Touch row ─────────────────────────────────────────────────────────
          Starts at y = NOTCH_RISE (bar surface).
          Height = BAR_CONTENT_H (all icons + labels + ios pad live here).
          Tabs are centred inside this zone — the notch dips only NOTCH_DIP (10px)
          which is small enough not to push icons down noticeably.
      ─────────────────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.tabRow,
          isRtl && styles.tabRowRtl,
          {
            marginTop: NOTCH_RISE,
            height: BAR_CONTENT_H,
            paddingBottom: IOS_PAD,
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => {
                if (isGuest && tab.id !== 'bible') { onGuestTabPress?.(); return; }
                setActiveTab?.(tab.id);
                tab.onPress();
              }}
            >
              {/*
                Every tab renders an icon slot of fixed size.
                Active tab shows an invisible placeholder (pill renders the icon).
                This keeps ALL labels at exactly the same vertical position.
              */}
              <View style={styles.iconSlot}>
                {!isActive && (
                  <Icon size={ICON_SIZE} color={COLORS.muted} strokeWidth={2} />
                )}
              </View>

              {!isActive && (
                <Text
                  style={[
                    styles.label,
                    { color: COLORS.muted },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              )}
              {/* Keep same height for active tab so icon stays aligned */}
              {isActive && <View style={styles.labelSlot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Height = transparent notch-rise area + bar content + ios pad
    height: WRAPPER_H,
    // No position:absolute here — Home.tsx's Animated.View handles positioning
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 16,
  },
  tabRow: {
    flexDirection: 'row',
  },
  tabRowRtl: {
    flexDirection: 'row-reverse',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  // Fixed-size slot so active (empty) and inactive (icon) are identical in layout
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelSlot: {
    height: 14,
  },
  pill: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 10,
  },
});