import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { colors } from '../../theme';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = isWeb && width > 520;

  if (!isLargeScreen) {
    return <View style={styles.mobileFull}>{children}</View>;
  }

  return (
    <View style={styles.webContainer}>
      {/* Phone Chassis Container */}
      <View style={styles.phoneChassis}>
        {/* Notch / Speaker */}
        <View style={styles.phoneSpeaker} />
        {/* Screen Content */}
        <View style={styles.screenInner}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mobileFull: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  webContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  phoneChassis: {
    width: '100%',
    maxWidth: 420,
    flex: 1,
    maxHeight: 880,
    backgroundColor: colors.surface,
    borderRadius: 38,
    borderWidth: 8,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    position: 'relative',
  },
  phoneSpeaker: {
    position: 'absolute',
    top: 6,
    left: '50%',
    width: 60,
    height: 4,
    marginLeft: -30,
    backgroundColor: '#334155',
    borderRadius: 2,
    zIndex: 9999,
  },
  screenInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
});
