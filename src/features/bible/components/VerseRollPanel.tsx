import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, View } from 'react-native';

export interface VerseRollPanelHandle {
  /** Starts the collapse animation; calls `onClosed` when finished. */
  requestHide: () => void;
}

/**
 * VerseRollPanel
 *
 * A reusable "roll" expand/collapse wrapper used for inline verse panels
 * (Strong's Concordance, Background, Journal). It mirrors the explanation's
 * hidden-measurer + animated-height pattern so any per-verse content can
 * expand/collapse smoothly without a modal or bottom sheet.
 *
 * - `active`: when true the panel measures its content and animates open.
 * - `onClosed`: called after the collapse animation completes (the parent
 *   usually clears its data map here, unmounting the panel).
 * - Imperative `requestHide()` (via ref): starts the collapse animation, then
 *   `onClosed` fires so the parent can clear its data. Content's "Hide"
 *   buttons call this through a prop.
 */
const VerseRollPanel = forwardRef<VerseRollPanelHandle, {
  active: boolean;
  onClosed?: () => void;
  children: React.ReactNode;
}>(function VerseRollPanel({ active, onClosed, children }, ref) {
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(active);
  const [ready, setReady] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (active && !mounted) {
      setMounted(true);
    } else if (!active && mounted) {
      // Data was cleared externally — animate the panel closed first.
      requestHide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mounted]);

  const handleLayout = useCallback(
    (e: any) => {
      const h = e.nativeEvent.layout.height;
      if (!ready) {
        setReady(true);
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: h,
          duration: 260,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start(() => setAnimDone(true));
      } else if (animDone && !closingRef.current) {
        anim.setValue(h);
      }
    },
    [ready, animDone, anim],
  );

  const requestHide = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(anim, {
      toValue: 0,
      duration: 220,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => {
      closingRef.current = false;
      setMounted(false);
      setReady(false);
      setAnimDone(false);
      onClosed?.();
    });
  }, [anim, onClosed]);

  useImperativeHandle(ref, () => ({ requestHide }), [requestHide]);

  if (!mounted) return null;

  return (
    <View style={{ position: 'relative' }}>
      {/* Hidden measurer — always present while mounted so content height is
          tracked even as the visible copy animates. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
        onLayout={handleLayout}
      >
        {children}
      </View>

      {/* Animated display */}
      <Animated.View style={!animDone && { height: anim, overflow: 'hidden' }}>
        {children}
      </Animated.View>
    </View>
  );
});

export default VerseRollPanel;
