import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  BackHandler,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { getSafeImageUri } from '../../utils/helpers';
import { styles } from '../../constants/styles';

export const ZoomableImageModalItem = ({
  uri,
  width,
  height,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (isZoomed: boolean) => void;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [zoomed, setZoomed] = useState(false);
  const lastTapRef = useRef<number>(0);

  const handleDoubleTap = (e: any) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (zoomed) {
        scrollRef.current?.scrollResponderZoomTo({
          x: 0,
          y: 0,
          width,
          height,
          animated: true,
        });
        setZoomed(false);
        onZoomChange(false);
      } else {
        const { locationX, locationY } = e.nativeEvent;
        const zoomW = width / 2.5;
        const zoomH = height / 2.5;
        scrollRef.current?.scrollResponderZoomTo({
          x: Math.max(0, (locationX || width / 2) - zoomW / 2),
          y: Math.max(0, (locationY || height / 2) - zoomH / 2),
          width: zoomW,
          height: zoomH,
          animated: true,
        });
        setZoomed(true);
        onZoomChange(true);
      }
    }
    lastTapRef.current = now;
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ width, height }}
      contentContainerStyle={{ width, height, justifyContent: 'center', alignItems: 'center' }}
      minimumZoomScale={1}
      maximumZoomScale={4}
      bouncesZoom={true}
      bounces={zoomed}
      alwaysBounceVertical={false}
      alwaysBounceHorizontal={false}
      centerContent={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(e) => {
        const currentZoom = e.nativeEvent.zoomScale ?? 1;
        const isZ = currentZoom > 1.05;
        if (isZ !== zoomed) {
          setZoomed(isZ);
          onZoomChange(isZ);
        }
      }}
    >
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <Image
          source={{ uri: getSafeImageUri(uri) }}
          style={{ width, height }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={150}
        />
      </TouchableWithoutFeedback>
    </ScrollView>
  );
};

export interface SwipeDownImageModalProps {
  visible: boolean;
  onClose: () => void;
  isZoomed?: boolean;
  counterText?: string;
  children: React.ReactNode;
}

export const SwipeDownImageModal = ({
  visible,
  onClose,
  isZoomed = false,
  counterText,
  children,
}: SwipeDownImageModalProps) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const isZoomedRef = useRef(isZoomed);
  const onCloseRef = useRef(onClose);
  const isDismissing = useRef(false);

  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      isDismissing.current = false;
    }
  }, [visible, translateY]);

  const doClose = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    onCloseRef.current();
    requestAnimationFrame(() => {
      translateY.setValue(0);
      isDismissing.current = false;
    });
  }, [translateY]);

  const handleClose = useCallback(() => {
    doClose();
  }, [doClose]);

  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backSub.remove();
  }, [visible, handleClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        if (isZoomedRef.current || isDismissing.current) return false;
        if (gs.numberActiveTouches > 1) return false;
        const dy = typeof gs.dy === 'number' ? gs.dy : 0;
        const dx = typeof gs.dx === 'number' ? gs.dx : 0;
        return dy > 10 && Math.abs(dy) > Math.abs(dx) * 1.4;
      },
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (isZoomedRef.current || isDismissing.current) return false;
        if (gs.numberActiveTouches > 1) return false;
        const dy = typeof gs.dy === 'number' ? gs.dy : 0;
        const dx = typeof gs.dx === 'number' ? gs.dx : 0;
        return dy > 10 && Math.abs(dy) > Math.abs(dx) * 1.4;
      },
      onPanResponderGrant: () => {
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        if (isDismissing.current) return;
        const dy = typeof gs.dy === 'number' ? gs.dy : 0;
        if (dy > 0) {
          translateY.setValue(dy);
        } else {
          translateY.setValue(dy * 0.15);
        }
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_, gs) => {
        if (isDismissing.current) return;
        const dy = typeof gs.dy === 'number' ? gs.dy : 0;
        const vy = typeof gs.vy === 'number' && !isNaN(gs.vy) ? gs.vy : 0;
        const shouldDismiss = dy > 90 || (dy > 30 && vy > 0.4);
        if (shouldDismiss) {
          isDismissing.current = true;
          onCloseRef.current();
          requestAnimationFrame(() => {
            translateY.setValue(0);
            isDismissing.current = false;
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            tension: 75,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (isDismissing.current) return;
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 75,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const bgOpacity = translateY.interpolate({
    inputRange: [0, 160, 320],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  const controlsOpacity = translateY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const imageScale = translateY.interpolate({
    inputRange: [0, 400],
    outputRange: [1, 0.86],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose} statusBarTranslucent={true}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} {...panResponder.panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'black', opacity: bgOpacity }]} pointerEvents="none" />

        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              justifyContent: 'center',
              alignItems: 'center',
              transform: [{ translateY }, { scale: imageScale }],
            },
          ]}
        >
          {children}
        </Animated.View>

        <Animated.View
          style={{
            position: 'absolute',
            top: Math.max(insets.top + 8, 48),
            right: 20,
            zIndex: 30,
            opacity: controlsOpacity,
          }}
        >
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} style={{ padding: 4 }}>
            <X size={30} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {counterText && (
          <Animated.View
            style={[styles.modalCounter, { bottom: Math.max(insets.bottom + 20, 30), opacity: controlsOpacity }]}
            pointerEvents="none"
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>{counterText}</Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};
