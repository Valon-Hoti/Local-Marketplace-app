import React, { createContext, useContext, useRef, useEffect, useCallback } from 'react';
import { View, Animated, Dimensions, PanResponder } from 'react-native';

export const SwipeBackContext = createContext<{ onBack: () => void } | null>(null);
export const useSwipeBack = () => useContext(SwipeBackContext);

export const SwipeBackContainer = ({
  onBack,
  style,
  children,
  isDetail = false,
}: {
  onBack?: () => void;
  style?: any;
  children: React.ReactNode;
  isDetail?: boolean;
}) => {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const translateX = useRef(new Animated.Value(0)).current;
  const swiping = useRef(false);

  const handleAnimatedBack = useCallback(() => {
    if (swiping.current) return;
    swiping.current = true;
    const sw = Dimensions.get('window').width;
    Animated.timing(translateX, {
      toValue: sw + 20,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      swiping.current = false;
      onBackRef.current?.();
    });
  }, [translateX]);

  // Dimming overlay fades as screen slides away
  const overlayOpacity = translateX.interpolate({
    inputRange: [0, Dimensions.get('window').width],
    outputRange: [0.45, 0],
    extrapolate: 'clamp',
  });

  // Edge zone PanResponder — only attached to the left-edge strip
  const edgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => {
        // Only capture if moving right and predominantly horizontal
        return gs.dx > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2;
      },
      onPanResponderGrant: () => {
        swiping.current = true;
        translateX.stopAnimation();
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) {
          translateX.setValue(gs.dx);
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gs) => {
        const sw = Dimensions.get('window').width;
        const dx = typeof gs.dx === 'number' ? gs.dx : 0;
        const vx = typeof gs.vx === 'number' && !isNaN(gs.vx) ? gs.vx : 0.6;
        const shouldDismiss = dx > sw * 0.25 || (dx > 30 && vx > 0.4);

        if (shouldDismiss && onBackRef.current) {
          const remaining = (sw + 20) - dx;
          const velocity = Math.max(vx, 0.6);
          const duration = Math.min(Math.max(remaining / velocity / 2, 100), 220);
          Animated.timing(translateX, {
            toValue: sw + 20,
            duration,
            useNativeDriver: true,
          }).start(() => {
            swiping.current = false;
            onBackRef.current?.();
          });
          setTimeout(() => {
            if (swiping.current) {
              swiping.current = false;
              onBackRef.current?.();
            }
          }, 260);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 8,
            tension: 65,
            useNativeDriver: true,
          }).start(() => {
            swiping.current = false;
          });
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }).start(() => {
          swiping.current = false;
        });
      },
    })
  ).current;

  return (
    <SwipeBackContext.Provider value={{ onBack: handleAnimatedBack }}>
      <View style={{ flex: 1 }}>
        {/* Dimming overlay — visible behind the sliding foreground */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            opacity: overlayOpacity,
            zIndex: 0,
          }}
        />

        {/* Foreground — the actual screen content that slides right */}
        <Animated.View
          style={[
            {
              flex: 1,
              transform: [{ translateX }],
              shadowColor: '#000',
              shadowOffset: { width: -3, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 10,
              zIndex: 1,
            },
            style,
          ]}
        >
          {children}
        </Animated.View>

        {/* Edge swipe zone — invisible strip on the left edge, sits on top of content */}
        {onBack && (
          <View
            {...edgePanResponder.panHandlers}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 28,
              backgroundColor: 'transparent',
              zIndex: 2,
            }}
          />
        )}
      </View>
    </SwipeBackContext.Provider>
  );
};
