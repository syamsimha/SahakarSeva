import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Text, TouchableOpacity } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { width, height } = useWindowDimensions();
  const { role, switchRole } = useAuth();
  const { language, setLanguage } = useLanguage();

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = isWeb && width > 520;

  if (!isLargeScreen) {
    return <View style={styles.mobileFull}>{children}</View>;
  }

  return (
    <View style={styles.webContainer}>
      {/* Top Demo Bar for Team Lead / Evaluator */}
      <View style={styles.demoBar}>
        <View style={styles.demoBrand}>
          <View style={styles.demoIcon}>
            <Ionicons name="people" size={14} color={colors.textInverse} />
          </View>
          <Text style={styles.demoTitle}>Sahakar Sathi — Mobile App Preview</Text>
        </View>

        {/* Quick Role Switcher */}
        <View style={styles.roleTabs}>
          {(['customer', 'worker', 'admin'] as const).map((r) => {
            const isActive = role === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => switchRole(r)}
                style={[styles.roleTab, isActive && styles.roleTabActive]}
              >
                <Text style={[styles.roleTabText, isActive && styles.roleTabTextActive]}>
                  {r === 'customer' ? 'Customer' : r === 'worker' ? 'Worker' : 'Admin'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Language Switcher */}
        <View style={styles.langPills}>
          {(['en', 'hi', 'te'] as const).map((l) => {
            const isActive = language === l;
            return (
              <TouchableOpacity
                key={l}
                onPress={() => setLanguage(l)}
                style={[styles.langPill, isActive && styles.langPillActive]}
              >
                <Text style={[styles.langPillText, isActive && styles.langPillTextActive]}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Phone Bezel Container */}
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
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  demoBar: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  demoBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  roleTab: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleTabActive: {
    backgroundColor: colors.primary,
  },
  roleTabText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
  langPills: {
    flexDirection: 'row',
    gap: 3,
  },
  langPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  langPillActive: {
    backgroundColor: colors.accent,
  },
  langPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  langPillTextActive: {
    color: '#FFFFFF',
  },
  phoneChassis: {
    width: '100%',
    maxWidth: 410,
    flex: 1,
    maxHeight: 840,
    backgroundColor: colors.surface,
    borderRadius: 38,
    borderWidth: 8,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
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
