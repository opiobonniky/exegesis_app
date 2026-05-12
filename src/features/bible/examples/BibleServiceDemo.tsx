import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import useBible from '../hooks/useBible';

export const BibleServiceDemo = () => {
  const [verse, setVerse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const {
    getVerseTextAsync,
    isOnline,
    getVerseText: getVerseTextSync
  } = useBible();

  const fetchVerse = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to get John 3:16 from backend if online, fallback to local
      const verseText = await getVerseTextAsync('John', 3, 16);

      if (verseText !== null) {
        setVerse(verseText);
      } else {
        // Fallback to local data
        const localVerse = getVerseTextSync('John', 3, 16) || 'Verse not found';
        setVerse(localVerse);
      }
    } catch (err) {
      setError('Failed to fetch verse');
      console.error(err);
      // Fallback to local data on error
      const localVerse = getVerseTextSync('John', 3, 16) || 'Verse not found';
      setVerse(localVerse);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerse();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bible Service Demo</Text>

      {/* Connection Status */}
      {isOnline !== null && (
        <View style={[
          styles.statusBar,
          { backgroundColor: isOnline ? '#10B98120' : '#EF444420' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: isOnline ? '#10B981' : '#EF4444' }
          ]}>
            {isOnline ? '● Online - Using backend API' : '● Offline - Using local data'}
          </Text>
        </View>
      )}

      {/* Verse Display */}
      <View style={styles.verseContainer}>
        <Text style={styles.verseLabel}>John 3:16</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#9CA3AF" />
            <Text style={styles.loadingText}>Loading verse...</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={styles.verseText}>
            "{verse}"
          </Text>
        )}
      </View>

      {/* Refresh Button */}
      <Button title="Refresh Verse" onPress={fetchVerse} />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.infoText}>
          This demo shows how the Bible service automatically switches between
          backend API (when online) and local data (when offline).
        </Text>
        <Text style={styles.infoText}>
          Try toggling your device's internet connection to see the switch in action.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusBar: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
  },
  verseContainer: {
    backgroundColor: '#F3F4F6',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  verseLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  verseText: {
    fontSize: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 16,
  },
  info: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },
});