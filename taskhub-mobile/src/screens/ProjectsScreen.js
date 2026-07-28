import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import Header from '../components/Header';
import { projectService } from '../api';
import { colors } from '../theme';
import { projectStatusLabel } from '../constants';

export default function ProjectsScreen({ user, onLogout, nav }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await projectService.getAll();
      setProjects(res.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không tải được danh sách dự án.');
    }
  }, []);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const name = user?.profile?.fullName || user?.username || 'bạn';

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Dự án" subtitle={`Chào, ${name}`} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandBlue} size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load().then(() => setLoading(false)); }}>
            <Text style={styles.retry}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có dự án nào.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => nav.push({ name: 'board', id: item.id, projectName: item.name })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {projectStatusLabel(item.status)} · {(item.members?.length ?? 0)} thành viên
                </Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logout: { color: colors.rose, fontWeight: '700', fontSize: 14 },
  err: { color: colors.rose, textAlign: 'center', marginBottom: 12 },
  retry: { color: colors.brandBlue, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.slate400, marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: colors.slate200, padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  cardMeta: { fontSize: 13, color: colors.slate500, marginTop: 4 },
  chev: { fontSize: 26, color: colors.slate300, marginLeft: 8 },
});
