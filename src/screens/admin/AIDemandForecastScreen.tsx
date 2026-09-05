import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, Badge } from '../../components/ui';
import { mockAIDemandForecasts } from '../../data';
import { AIDemandForecast } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface AIDemandForecastScreenProps {
  onBack?: () => void;
}

export const AIDemandForecastScreen: React.FC<AIDemandForecastScreenProps> = ({ onBack }) => {
  const [forecast, setForecast] = useState<AIDemandForecast>(mockAIDemandForecasts[0]);

  return (
    <View style={styles.container}>
      <Header
        title="AI Demand Forecasting"
        subtitle="Predictive Labour Supply & Demand"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Model Readiness & Disclaimer Box */}
        <View style={styles.modelStatusCard}>
          <View style={styles.modelStatusTop}>
            <View style={styles.sparkleBox}>
              <Ionicons name="sparkles" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.modelStatusTitle}>Demand Forecaster (Simulated Prototype)</Text>
              <Text style={styles.modelStatusSub}>
                Model Confidence: {forecast.confidenceScore}% • Zone: {forecast.zoneCode}
              </Text>
            </View>
          </View>
          <Text style={styles.modelDisclaimer}>
            Architecture Note: This screen consumes the decoupled analyticsService layer. It presents realistic predictive data ready for immediate handoff to real BigQuery / TensorFlow Lite time-series models.
          </Text>
        </View>

        {/* Forecast Zone & Weather Impact */}
        <View style={styles.zoneCard}>
          <Text style={styles.zoneLabel}>Target Zone & Weather Correlation</Text>
          <Text style={styles.zoneName}>{forecast.zoneName}</Text>
          {forecast.weatherImpactNote && (
            <View style={styles.weatherNotice}>
              <Ionicons name="cloud" size={16} color={colors.info} />
              <Text style={styles.weatherText}>{forecast.weatherImpactNote}</Text>
            </View>
          )}

          <View style={styles.peakHoursRow}>
            <Ionicons name="time" size={14} color={colors.textSecondary} />
            <Text style={styles.peakHoursText}>
              Predicted Peak Hours: {forecast.peakHours.join(' & ')}
            </Text>
          </View>
        </View>

        {/* High Demand Services Breakdown */}
        <Text style={styles.sectionTitle}>High Demand Predicted Trades</Text>
        <View style={styles.servicesList}>
          {forecast.highDemandServices.map((item, index) => {
            const hasShortfall = item.shortfall > 0;
            return (
              <View key={index} style={styles.serviceCard}>
                <View style={styles.serviceTop}>
                  <View>
                    <Text style={styles.tradeTitle}>{item.categoryTitle}</Text>
                    <Text style={styles.demandGrowth}>+{item.demandGrowthPercentage}% Demand Expected</Text>
                  </View>
                  <View
                    style={[
                      styles.shortfallBadge,
                      { backgroundColor: hasShortfall ? colors.dangerLight : colors.successLight },
                    ]}
                  >
                    <Text
                      style={[
                        styles.shortfallText,
                        { color: hasShortfall ? colors.danger : colors.success },
                      ]}
                    >
                      {hasShortfall ? `-${item.shortfall} Shortfall` : 'Adequate Supply'}
                    </Text>
                  </View>
                </View>

                {/* Worker Counts Grid */}
                <View style={styles.countsRow}>
                  <View style={styles.countBox}>
                    <Text style={styles.countVal}>{item.requiredWorkers}</Text>
                    <Text style={styles.countLabel}>Required</Text>
                  </View>
                  <View style={styles.countDivider} />
                  <View style={styles.countBox}>
                    <Text style={styles.countVal}>{item.availableWorkers}</Text>
                    <Text style={styles.countLabel}>Available</Text>
                  </View>
                  <View style={styles.countDivider} />
                  <View style={styles.countBox}>
                    <Text
                      style={[
                        styles.countVal,
                        { color: hasShortfall ? colors.danger : colors.success },
                      ]}
                    >
                      {hasShortfall ? item.shortfall : '0'}
                    </Text>
                    <Text style={styles.countLabel}>Deficit</Text>
                  </View>
                </View>

                {/* AI Recommendation */}
                <View style={styles.recommendationBox}>
                  <Ionicons name="bulb" size={14} color={colors.accent} />
                  <Text style={styles.recommendationText}>
                    Suggested Action: {item.recommendedAction}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  modelStatusCard: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  modelStatusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sparkleBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentDark,
  },
  modelStatusSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modelDisclaimer: {
    fontSize: 10,
    color: colors.accentDark,
    lineHeight: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  zoneCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoneLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  zoneName: {
    ...typography.h4,
    color: colors.text,
    marginTop: 2,
  },
  weatherNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  weatherText: {
    fontSize: 11,
    color: colors.info,
    marginLeft: 6,
    flex: 1,
  },
  peakHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  peakHoursText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tradeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  demandGrowth: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  shortfallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  shortfallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  countBox: {
    flex: 1,
    alignItems: 'center',
  },
  countVal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  countLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  countDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySurface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  recommendationText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
});
