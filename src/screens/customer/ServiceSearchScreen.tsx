import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar } from '../../components/common';
import { WorkerCard } from '../../components/cards';
import { EmptyState } from '../../components/ui';
import { serviceCategories } from '../../data';
import { workerService } from '../../services';
import { WorkerProfile, ServiceCategoryKey } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface ServiceSearchScreenProps {
  initialCategoryId?: string;
  onNavigateToWorkerProfile: (workerId: string) => void;
  onNavigateToBookingFlow: (workerId: string) => void;
  onBack?: () => void;
}

export const ServiceSearchScreen: React.FC<ServiceSearchScreenProps> = ({
  initialCategoryId,
  onNavigateToWorkerProfile,
  onNavigateToBookingFlow,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId || 'all');
  const [minRating, setMinRating] = useState<number>(0);
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price'>('distance');
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, [searchQuery, selectedCategory, minRating, availableOnly, sortBy]);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const data = await workerService.getWorkers({
        searchQuery,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        minRating: minRating > 0 ? minRating : undefined,
        availableOnly: availableOnly || undefined,
        verifiedOnly: true,
      });

      // Sorting
      if (sortBy === 'rating') {
        data.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'price') {
        data.sort((a, b) => a.hourlyRate - b.hourlyRate);
      } else {
        data.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }

      setWorkers(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Find Services & Workers"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      {/* Search Input */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search electrician, plumber, carpenter..."
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoryPillsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('all')}
            style={[styles.pill, selectedCategory === 'all' && styles.pillActive]}
          >
            <Text style={[styles.pillText, selectedCategory === 'all' && styles.pillTextActive]}>
              All Services
            </Text>
          </TouchableOpacity>

          {serviceCategories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[styles.pill, isActive && styles.pillActive]}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {cat.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filters Bar: Rating, Available, Sort */}
      <View style={styles.filtersBar}>
        <TouchableOpacity
          onPress={() => setAvailableOnly(!availableOnly)}
          style={[styles.filterChip, availableOnly && styles.filterChipActive]}
        >
          <Ionicons
            name="flash-outline"
            size={13}
            color={availableOnly ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.filterChipText, availableOnly && styles.filterChipTextActive]}>
            Available Now
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
          style={[styles.filterChip, minRating === 4.5 && styles.filterChipActive]}
        >
          <Ionicons
            name="star"
            size={12}
            color={minRating === 4.5 ? colors.primary : '#F59E0B'}
          />
          <Text style={[styles.filterChipText, minRating === 4.5 && styles.filterChipTextActive]}>
            4.5+ Rating
          </Text>
        </TouchableOpacity>

        {/* Sort Cycle */}
        <TouchableOpacity
          onPress={() => {
            if (sortBy === 'distance') setSortBy('rating');
            else if (sortBy === 'rating') setSortBy('price');
            else setSortBy('distance');
          }}
          style={styles.sortBtn}
        >
          <Ionicons name="swap-vertical" size={13} color={colors.primary} />
          <Text style={styles.sortBtnText}>
            Sort: {sortBy === 'distance' ? 'Near' : sortBy === 'rating' ? 'Top Rated' : 'Price'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Worker List */}
      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <WorkerCard
            worker={item}
            onPress={() => onNavigateToWorkerProfile(item.id)}
            onBookNow={() => onNavigateToBookingFlow(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title="No Cooperative Workers Found"
            message="Try clearing your search query or selecting a different service category."
            actionTitle="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setMinRating(0);
              setAvailableOnly(false);
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
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  categoryPillsContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pillsScroll: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
  },
  filtersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 3,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
