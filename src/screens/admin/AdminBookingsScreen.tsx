import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar } from '../../components/common';
import { BookingCard } from '../../components/cards';
import { EmptyState } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { BookingStatus } from '../../types';

interface AdminBookingsScreenProps {
  onBack?: () => void;
}

export const AdminBookingsScreen: React.FC<AdminBookingsScreenProps> = ({ onBack }) => {
  const { bookings } = useBookings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusTabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Bookings' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'on_the_way', label: 'On The Way' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'requested', label: 'Requested' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="District Master Bookings"
        subtitle={`${filtered.length} operations tracked`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <View style={styles.topSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter by code, worker, customer..."
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusTabs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.statusPillsRow}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setStatusFilter(item.id)}
                style={[styles.pill, isSelected && styles.pillActive]}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <BookingCard booking={item} onPress={() => {}} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Bookings Match Query"
            message="Adjust your search filters or status criteria."
            actionTitle="Reset"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
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
  topSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusPillsRow: {
    gap: 8,
    marginTop: spacing.sm,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
