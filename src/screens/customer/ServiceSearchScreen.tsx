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
import { WorkerProfile, ServiceCategoryKey, ServiceCategory } from '../../types';
import { CategoryDetailsModal } from '../../components/customer';
import { filterWorkersByCategory } from './customerWorkerFilter';
import { useLanguage } from '../../context/LanguageContext';
import { useLocation } from '../../context/LocationContext';
import { Ionicons } from '@expo/vector-icons';

interface ServiceSearchScreenProps {
  initialCategoryId?: string;
  initialSearchQuery?: string;
  activeLocationName?: string;
  onLocationPress?: () => void;
  onNavigateToWorkerProfile: (workerId: string) => void;
  onNavigateToBookingFlow: (workerId: string, categoryId?: string) => void;
  onBack?: () => void;
}

export const ServiceSearchScreen: React.FC<ServiceSearchScreenProps> = ({
  initialCategoryId,
  initialSearchQuery,
  activeLocationName,
  onLocationPress,
  onNavigateToWorkerProfile,
  onNavigateToBookingFlow,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const { currentLocation, openLocationModal } = useLocation();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId || 'all');
  const [minRating, setMinRating] = useState<number>(0);
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price'>('distance');
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryModalData, setCategoryModalData] = useState<ServiceCategory | null>(null);

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategory(initialCategoryId);
    }
  }, [initialCategoryId]);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    fetchWorkers();
  }, [searchQuery, selectedCategory, minRating, availableOnly, sortBy]);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const allWorkers = await workerService.getWorkers({
        searchQuery,
        minRating: minRating > 0 ? minRating : undefined,
        availableOnly: availableOnly || undefined,
      });

      // Customer-scoped category matching (preserves untouched workerService.ts)
      const data = filterWorkersByCategory(allWorkers, selectedCategory);

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

  const activeCat = serviceCategories.find((c) => c.id === selectedCategory);

  return (
    <View style={styles.container}>
      <Header
        title={t('search_title')}
        showBack={Boolean(onBack)}
        onBack={onBack}
        showLocation={Boolean(activeLocationName)}
        locationName={activeLocationName}
        onLocationPress={onLocationPress}
      />

      {/* Search Input */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('search_placeholder')}
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
              {t('all_categories')}
            </Text>
          </TouchableOpacity>

          {serviceCategories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const catLabel =
              language === 'hi' && cat.hindiTitle
                ? cat.hindiTitle
                : language === 'te' && cat.teluguTitle
                ? cat.teluguTitle
                : cat.title;

            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[styles.pill, isActive && styles.pillActive]}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {catLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Tariffs & Tasks Banner */}
      {activeCat && (
        <TouchableOpacity
          style={styles.categoryInfoBar}
          onPress={() => setCategoryModalData(activeCat)}
          activeOpacity={0.8}
        >
          <View style={styles.catInfoLeft}>
            <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
            <Text style={styles.catInfoText}>
              <Text style={{ fontWeight: '700' }}>
                {language === 'hi' && activeCat.hindiTitle
                  ? activeCat.hindiTitle
                  : language === 'te' && activeCat.teluguTitle
                  ? activeCat.teluguTitle
                  : activeCat.title}:
              </Text> Starts at ₹{activeCat.basePrice}
            </Text>
          </View>
          <Text style={styles.catInfoLink}>View Tasks & Tariffs ›</Text>
        </TouchableOpacity>
      )}

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
            {t('available_only')}
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
            onBookNow={() => onNavigateToBookingFlow(item.id, selectedCategory !== 'all' ? selectedCategory : undefined)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title={searchQuery.trim() ? t('no_workers_found') : t('no_results_found')}
            message={
              searchQuery.trim()
                ? t('workers_matching', { query: searchQuery })
                : t('adjust_filters')
            }
            actionTitle={t('clear_search')}
            onAction={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setMinRating(0);
              setAvailableOnly(false);
            }}
          />
        }
      />

      <CategoryDetailsModal
        visible={Boolean(categoryModalData)}
        category={categoryModalData}
        onClose={() => setCategoryModalData(null)}
        onFindWorkers={(catId) => setSelectedCategory(catId)}
        onBookTask={(catId, subId) => {
          setCategoryModalData(null);
          // If we have workers in this category, book the first one or default
          const w = workers.length > 0 ? workers[0].id : 'worker-101';
          onNavigateToBookingFlow(w, catId);
        }}
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

  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationStripText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 6,
    marginRight: 8,
  },
  changeLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  changeLocBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  categoryInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13, 122, 95, 0.2)',
  },
  catInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  catInfoText: {
    fontSize: 12,
    color: colors.primaryDark,
    marginLeft: 6,
  },
  catInfoLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
