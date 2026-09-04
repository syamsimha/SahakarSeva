import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

export interface MapWorkerMarker {
  id: string;
  name: string;
  skill: string;
  rating: number;
  hourlyRate: number;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  isAvailable?: boolean;
}

export interface InteractiveMapProps {
  height?: number;
  centerLatitude?: number;
  centerLongitude?: number;
  zoom?: number;
  userLocationName?: string;
  isGps?: boolean;
  isLoadingLocation?: boolean;
  locationError?: string | null;
  onRetryGps?: () => void;
  onSelectManualLocation?: () => void;
  workers?: MapWorkerMarker[];
  trackingWorker?: {
    name: string;
    skill: string;
    latitude: number;
    longitude: number;
    updatedAt?: string;
  };
  onWorkerSelect?: (workerId: string) => void;
  style?: ViewStyle;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  height = 220,
  centerLatitude,
  centerLongitude,
  zoom = 14,
  userLocationName,
  isGps = false,
  isLoadingLocation = false,
  locationError,
  onRetryGps,
  onSelectManualLocation,
  workers = [],
  trackingWorker,
  onWorkerSelect,
  style,
}) => {
  const { t } = useLanguage();
  const [selectedWorker, setSelectedWorker] = useState<MapWorkerMarker | null>(null);
  const [mapProvider, setMapProvider] = useState<'google' | 'leaflet'>('leaflet');
  const [isLoaded, setIsLoaded] = useState(false);
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  // On Web: generate an embedded interactive Leaflet or Google Map
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setIsLoaded(true);
      return;
    }

    // Check if Google Maps is requested and has API key
    if (googleApiKey && typeof window !== 'undefined') {
      setMapProvider('google');
    } else {
      setMapProvider('leaflet');
    }
    setIsLoaded(true);
  }, [googleApiKey]);

  // Handle postMessages from inside map iframe (worker card selection)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SELECT_WORKER' && onWorkerSelect) {
        onWorkerSelect(event.data.workerId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onWorkerSelect]);

  const hasCoordinates =
    typeof centerLatitude === 'number' &&
    typeof centerLongitude === 'number' &&
    !isNaN(centerLatitude) &&
    !isNaN(centerLongitude) &&
    (centerLatitude !== 0 || centerLongitude !== 0);

  // Generate Google Maps HTML Document if API key is active
  const generateGoogleMapsHtml = () => {
    const customerPinLat = centerLatitude || 0;
    const customerPinLng = centerLongitude || 0;

    const workerMarkersJs = workers
      .filter((w) => w.latitude && w.longitude)
      .map(
        (w) => `
        var marker${escapeVar(w.id)} = new google.maps.Marker({
          position: { lat: ${w.latitude}, lng: ${w.longitude} },
          map: map,
          title: "${escapeHtml(w.name)}",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#0D7A5F",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF"
          }
        });

        var info${escapeVar(w.id)} = new google.maps.InfoWindow({
          content: '<div style="font-family:sans-serif;padding:6px;min-width:140px;">' +
            '<div style="font-weight:700;font-size:13px;color:#1E293B;">${escapeHtml(w.name)}</div>' +
            '<div style="font-size:11px;color:#0D7A5F;font-weight:600;margin-top:2px;">${escapeHtml(w.skill)}</div>' +
            '<div style="font-size:11px;color:#64748B;margin-top:2px;">⭐ ${w.rating} • ₹${w.hourlyRate}/hr</div>' +
            '<button onclick="window.parent.postMessage({type:\\'SELECT_WORKER\\',workerId:\\'${w.id}\\'},\\'*\\')" style="margin-top:6px;background:#0D7A5F;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;width:100%;font-weight:600;">Select Worker</button>' +
            '</div>'
        });

        marker${escapeVar(w.id)}.addListener('click', function() {
          info${escapeVar(w.id)}.open(map, marker${escapeVar(w.id)});
        });
      `
      )
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #e2e8f0; }
        </style>
        <script src="https://maps.googleapis.com/maps/api/js?key=${googleApiKey}"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var center = { lat: ${customerPinLat}, lng: ${customerPinLng} };
          var map = new google.maps.Map(document.getElementById("map"), {
            zoom: ${zoom},
            center: center,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });

          // User Pin - You Are Here
          var userMarker = new google.maps.Marker({
            position: center,
            map: map,
            title: "${isGps ? 'You Are Here (Live GPS)' : 'Selected Location'}",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 11,
              fillColor: "#2563EB",
              fillOpacity: 1,
              strokeWeight: 3,
              strokeColor: "#FFFFFF"
            }
          });

          var userInfo = new google.maps.InfoWindow({
            content: '<div style="font-family:sans-serif;padding:4px;"><strong style="color:#2563EB;">${isGps ? '📍 You Are Here (Live GPS)' : '🗺️ Selected Location'}</strong><br><span style="font-size:11px;color:#64748B;">${escapeHtml(userLocationName || 'Current Location')}</span></div>'
          });
          userMarker.addListener('click', function() {
            userInfo.open(map, userMarker);
          });

          ${workerMarkersJs}

          ${
            trackingWorker && trackingWorker.latitude && trackingWorker.longitude
              ? `
          var trackMarker = new google.maps.Marker({
            position: { lat: ${trackingWorker.latitude}, lng: ${trackingWorker.longitude} },
            map: map,
            title: "${escapeHtml(trackingWorker.name)} (${escapeHtml(trackingWorker.skill)})",
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: "#DC2626",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#FFFFFF"
            }
          });
          var trackInfo = new google.maps.InfoWindow({
            content: '<div style="font-family:sans-serif;padding:4px;"><strong style="color:#DC2626;">🛵 ${escapeHtml(trackingWorker.name)}</strong><br><span style="font-size:11px;color:#334155;">${escapeHtml(trackingWorker.skill)}</span></div>'
          });
          trackInfo.open(map, trackMarker);
          var bounds = new google.maps.LatLngBounds();
          bounds.extend(center);
          bounds.extend({ lat: ${trackingWorker.latitude}, lng: ${trackingWorker.longitude} });
          map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
          `
              : ''
          }
        </script>
      </body>
      </html>
    `;
  };

  // Build Leaflet HTML Document string for safe, seamless web rendering
  const generateLeafletHtml = () => {
    const customerPinLat = centerLatitude || 0;
    const customerPinLng = centerLongitude || 0;

    const workerMarkersJs = workers
      .filter((w) => w.latitude && w.longitude)
      .map(
        (w) => `
        var workerMarker = L.marker([${w.latitude}, ${w.longitude}], {
          icon: L.divIcon({
            className: 'custom-worker-icon',
            html: '<div style="background-color:#0D7A5F;color:white;width:32px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:16px;cursor:pointer;">🛠️</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(map);

        workerMarker.bindPopup(
          '<div style="font-family:sans-serif;padding:4px;min-width:140px;">' +
          '<div style="font-weight:700;font-size:13px;color:#1E293B;">${escapeHtml(w.name)}</div>' +
          '<div style="font-size:11px;color:#0D7A5F;font-weight:600;margin-top:2px;">${escapeHtml(w.skill)}</div>' +
          '<div style="font-size:11px;color:#64748B;margin-top:2px;">⭐ ${w.rating} • ₹${w.hourlyRate}/hr</div>' +
          '<div style="font-size:10px;color:#94A3B8;margin-top:2px;">${w.distanceKm ? w.distanceKm + ' km away' : 'Near you'}</div>' +
          '<button onclick="window.parent.postMessage({type:\\'SELECT_WORKER\\',workerId:\\'${w.id}\\'},\\'*\\')" style="margin-top:6px;background:#0D7A5F;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;width:100%;font-weight:600;">Select Worker</button>' +
          '</div>'
        );
      `
      )
      .join('\n');

    let trackingJs = '';
    if (trackingWorker && trackingWorker.latitude && trackingWorker.longitude) {
      trackingJs = `
        var trackMarker = L.marker([${trackingWorker.latitude}, ${trackingWorker.longitude}], {
          icon: L.divIcon({
            className: 'tracking-worker-icon',
            html: '<div style="background-color:#DC2626;color:white;width:36px;height:36px;border-radius:18px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 0 10px rgba(220,38,38,0.6);font-size:18px;">🛵</div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          })
        }).addTo(map);

        trackMarker.bindPopup(
          '<div style="font-family:sans-serif;padding:4px;">' +
          '<div style="font-weight:700;font-size:13px;color:#DC2626;">En Route to Your Location</div>' +
          '<div style="font-size:11px;color:#334155;margin-top:2px;">${escapeHtml(trackingWorker.name)} (${escapeHtml(trackingWorker.skill)})</div>' +
          '</div>'
        ).openPopup();

        // Polyline from worker to customer
        var latlngs = [
          [${trackingWorker.latitude}, ${trackingWorker.longitude}],
          [${customerPinLat}, ${customerPinLng}]
        ];
        var polyline = L.polyline(latlngs, {color: '#0D7A5F', dashArray: '6, 8', weight: 4, opacity: 0.8}).addTo(map);
        map.fitBounds(polyline.getBounds(), {padding: [30, 30]});
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #e2e8f0; }
          #map { width: 100%; height: 100%; }
          .custom-user-icon { animation: pulse 2s infinite; }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${customerPinLat}, ${customerPinLng}], ${zoom});
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Customer Pin - You Are Here
          var userMarker = L.marker([${customerPinLat}, ${customerPinLng}], {
            icon: L.divIcon({
              className: 'custom-user-icon',
              html: '<div style="background-color:#2563EB;color:white;width:34px;height:34px;border-radius:17px;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 0 12px rgba(37,99,235,0.7);font-size:16px;">📍</div>',
              iconSize: [34, 34],
              iconAnchor: [17, 17]
            })
          }).addTo(map);

          userMarker.bindPopup(
            '<div style="font-family:sans-serif;padding:3px;">' +
            '<div style="font-weight:700;font-size:12px;color:#2563EB;">${isGps ? '📍 Live GPS: You Are Here' : '🗺️ Selected Cooperative Zone'}</div>' +
            '<div style="font-size:11px;color:#475569;margin-top:2px;">${escapeHtml(userLocationName || 'Current Location')}</div>' +
            '</div>'
          ).openPopup();

          ${workerMarkersJs}
          ${trackingJs}
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={[styles.container, { height }, style]}>
      {/* 1. Loading State */}
      {isLoadingLocation ? (
        <View style={styles.stateOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateTitle}>{t('detecting_gps')}</Text>
          <Text style={styles.stateSubtitle}>{t('acquiring_coordinates')}</Text>
        </View>
      ) : !hasCoordinates ? (
        /* 2. Error / Permission Denied State: NEVER silent Bengaluru */
        <View style={styles.stateOverlay}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="location-outline" size={28} color={colors.warning} />
          </View>
          <Text style={styles.stateTitle}>{t('unable_determine_location')}</Text>
          <Text style={styles.stateSubtitle}>
            {locationError || t('gps_not_granted')}
          </Text>
          <View style={styles.actionBtnRow}>
            {onRetryGps && (
              <TouchableOpacity style={styles.retryBtn} onPress={onRetryGps} activeOpacity={0.8}>
                <Ionicons name="navigate-circle" size={16} color={colors.textInverse} style={{ marginRight: 5 }} />
                <Text style={styles.retryBtnText}>{t('retry_gps')}</Text>
              </TouchableOpacity>
            )}
            {onSelectManualLocation && (
              <TouchableOpacity
                style={styles.manualSelectBtn}
                onPress={onSelectManualLocation}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} style={{ marginRight: 5 }} />
                <Text style={styles.manualSelectBtnText}>{t('enter_location_manually')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : Platform.OS === 'web' ? (
        /* 3. Real Interactive Map (Google Maps or Leaflet) */
        <iframe
          title="SahakarSeva Cooperative Map"
          srcDoc={mapProvider === 'google' && googleApiKey ? generateGoogleMapsHtml() : generateLeafletHtml()}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 12,
          }}
        />
      ) : (
        <View style={styles.nativeFallback}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.fallbackText}>{userLocationName || t('location_current')}</Text>
        </View>
      )}

      {/* Floating Status Badge at top right */}
      {hasCoordinates && !isLoadingLocation && (
        <View style={styles.floatingHeader}>
          <View style={[styles.gpsIndicator, isGps ? styles.gpsActive : styles.gpsManual]}>
            <Ionicons
              name={isGps ? 'navigate' : 'map'}
              size={12}
              color={isGps ? colors.info : colors.textSecondary}
            />
            <Text style={[styles.gpsText, isGps ? styles.gpsTextActive : styles.gpsTextManual]}>
              {isGps ? t('live_gps_loc') : t('manual_selected_zone')}
            </Text>
          </View>

          {workers.length > 0 && !trackingWorker && (
            <View style={styles.workersCountBadge}>
              <Text style={styles.workersCountText}>{t('nearby_count', { count: workers.length })}</Text>
            </View>
          )}

          {trackingWorker && (
            <View style={styles.trackingLiveBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.trackingLiveText}>{t('live_tracking_badge')}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str.replace(/['"\\&<>\n\r]/g, ' ');
}

function escapeVar(str?: string): string {
  if (!str) return '1';
  return str.replace(/[^a-zA-Z0-9]/g, '_');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: '#F8FAFC',
  },
  stateIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  stateSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  manualSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  manualSelectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  nativeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  fallbackText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  floatingHeader: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  gpsActive: {
    borderWidth: 1,
    borderColor: colors.info,
  },
  gpsManual: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  gpsTextActive: {
    color: colors.info,
  },
  gpsTextManual: {
    color: colors.textSecondary,
  },
  workersCountBadge: {
    marginLeft: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  workersCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
  },
  trackingLiveBadge: {
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 5,
  },
  trackingLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
});
