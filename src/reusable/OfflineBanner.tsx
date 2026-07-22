import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useConnectivity } from '../providers/ConnectivityProvider';
import { getColors, SPACING, FONT_SIZES } from '../constants/theme';
import { WifiOff } from 'lucide-react-native';
import { AppContext } from '../common/AppContext';

const BANNER_HEIGHT = 20;
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 0;

const OfflineBanner = () => {
  const { isOnline } = useConnectivity();
  const isDark = React.useContext(AppContext)?.isDark ?? false;
  const COLORS = getColors(isDark);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bottomHeight = useRef(new Animated.Value(0)).current;

  const isOffline = isOnline === false;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: isOffline ? BANNER_HEIGHT : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(bottomHeight, {
        toValue: isOffline ? BOTTOM_INSET : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: isOffline ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isOffline, heightAnim, bottomHeight, opacityAnim]);

  if (isOnline === null) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            height: heightAnim,
            opacity: opacityAnim,
            backgroundColor: COLORS.warning,
            overflow: 'hidden',
          },
        ]}
        pointerEvents={isOffline ? 'auto' : 'none'}
      >
        <StatusBar
          backgroundColor={isOffline ? COLORS.warning : undefined}
          barStyle="light-content"
        />
        <View style={styles.inner}>
          <WifiOff size={12} color="#FFFFFF" />
          <Text style={styles.text}>
            No internet connection. 
          </Text>
        </View>
      </Animated.View>
      <Animated.View
        style={{
          height: bottomHeight,
          opacity: opacityAnim,
          backgroundColor: COLORS.warning,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    // height: BANNER_HEIGHT,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default OfflineBanner;
