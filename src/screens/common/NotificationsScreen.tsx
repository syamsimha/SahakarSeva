import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { EmptyState } from '../../components/ui';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationItem } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface NotificationsScreenProps {
  onBack?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'booking':
        return 'calendar';
      case 'job':
        return 'briefcase';
      case 'welfare':
        return 'shield-checkmark';
      case 'payment':
        return 'cash';
      case 'emergency':
        return 'flash';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'welfare':
        return colors.primary;
      case 'payment':
        return colors.success;
      case 'emergency':
        return colors.danger;
      default:
        return colors.info;
    }
  };



  return (
    <View style={styles.container}>
      <Header
        title="Notifications & Alerts"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <View style={styles.topBar}>
        <Text style={styles.unreadCount}>
          {unreadCount} Unread Updates
        </Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markReadText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.notifCard, !item.read && styles.notifCardUnread]}>
            <View style={[styles.iconBox, { backgroundColor: `${getIconColor(item.type)}18` }]}>
              <Ionicons name={getIcon(item.type) as any} size={20} color={getIconColor(item.type)} />
            </View>
            <View style={styles.contentCol}>
              <View style={styles.titleRow}>
                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.timeText}>{item.timestamp}</Text>
              </View>
              <Text style={styles.bodyText}>{item.body}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No Notifications"
            message="You're all caught up with your cooperative updates!"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifCardUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  bodyText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
});
