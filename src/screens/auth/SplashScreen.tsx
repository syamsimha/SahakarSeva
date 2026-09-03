import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onFinish}
      style={styles.container}
    >
      <View style={styles.centerContent}>
        {/* Cooperative Emblem */}
        <View style={styles.logoCircle}>
          <Ionicons name="people" size={54} color={colors.textInverse} />
          <View style={styles.handBadge}>
            <Ionicons name="shield-checkmark" size={24} color={colors.accent} />
          </View>
        </View>

        <Text style={styles.appName}>SAHAKAR SATHI</Text>
        <Text style={styles.tagline}>
          Trusted Services. Empowered Workers. Stronger Cooperatives.
        </Text>

        <View style={styles.coopPill}>
          <Ionicons name="leaf" size={13} color={colors.accentLight} style={{ marginRight: 5 }} />
          <Text style={styles.coopText}>Labour Cooperative Federation Network</Text>
        </View>
      </View>

      <View style={styles.bottomFooter}>
        <ActivityIndicator size="small" color={colors.textInverse} style={{ marginBottom: 12 }} />
        <Text style={styles.footerNote}>Cooperative-Owned Digital Marketplace</Text>
        <Text style={styles.versionText}>Version 1.0.0 • Tap anywhere to enter</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  handBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.surface,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  coopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  coopText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textInverse,
  },
  bottomFooter: {
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  versionText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
});
