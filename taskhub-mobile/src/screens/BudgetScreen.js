import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import Header from '../components/Header';
import { budgetService } from '../api';
import { colors } from '../theme';
import { formatVnd, importanceMeta, reqStatusMeta } from '../constants';

function Badge({ meta }) {
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
    </View>
  );
}

export default function BudgetScreen({ route, nav }) {
  const { projectId, projectName } = route;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [upgrade, setUpgrade] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setError(''); setUpgrade(false);
    try {
      const res = await budgetService.get(projectId);
      setData(res.data);
    } catch (e) {
      if (e.response?.data?.requiresUpgrade) setUpgrade(true);
      else setError(e.response?.data?.message || e.message || 'Không tải được ngân sách.');
    }
  }, [projectId]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const approve = async (r) => {
    setBusyId(r.id);
    try { await budgetService.approve(projectId, r.id); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Không duyệt được.'); }
    finally { setBusyId(null); }
  };
  const doReject = async (r) => {
    if (!reason.trim()) { setError('Nhập lý do không duyệt.'); return; }
    setBusyId(r.id);
    try { await budgetService.reject(projectId, r.id, reason.trim()); setRejectingId(null); setReason(''); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Không từ chối được.'); }
    finally { setBusyId(null); }
  };

  const b = data || {};
  const requests = b.requests || [];
  const pending = requests.filter((r) => r.status === 'Pending');
  const decided = requests.filter((r) => r.status !== 'Pending');
  const usedPct = b.budget > 0 ? Math.min(100, Math.round((b.spent / b.budget) * 100)) : 0;

  const RequestCard = ({ r }) => (
    <View style={[styles.reqCard, r.status === 'Pending' && r.amount > (b.remaining || 0) && styles.over]}>
      <View style={styles.reqTop}>
        <Text style={styles.amount}>{formatVnd(r.amount)}</Text>
        <Badge meta={importanceMeta(r.importance)} />
        <Badge meta={reqStatusMeta(r.status)} />
      </View>
      {r.reason ? <Text style={styles.reqLine}><Text style={styles.reqKey}>Lý do: </Text>{r.reason}</Text> : null}
      {r.purpose ? <Text style={styles.reqLine}><Text style={styles.reqKey}>Mục đích: </Text>{r.purpose}</Text> : null}
      {r.status === 'Rejected' && r.rejectionReason ? (
        <Text style={[styles.reqLine, { color: colors.rose }]}><Text style={styles.reqKey}>Không duyệt: </Text>{r.rejectionReason}</Text>
      ) : null}

      {b.canManage && r.status === 'Pending' ? (
        rejectingId === r.id ? (
          <View style={{ marginTop: 10 }}>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Lý do không duyệt..."
              placeholderTextColor={colors.slate400}
              multiline
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => doReject(r)} disabled={busyId === r.id}>
                <Text style={styles.rejectText}>Xác nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => { setRejectingId(null); setReason(''); }}>
                <Text style={styles.ghostText}>Huỷ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => approve(r)} disabled={busyId === r.id}>
              {busyId === r.id ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.approveText}>Duyệt</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => { setRejectingId(r.id); setReason(''); setError(''); }}>
              <Text style={styles.ghostText}>Không duyệt</Text>
            </TouchableOpacity>
          </View>
        )
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Ngân sách dự án" subtitle={projectName} onBack={nav.pop} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandBlue} size="large" /></View>
      ) : upgrade ? (
        <View style={styles.center}>
          <Text style={styles.upgradeTitle}>Tính năng Premium</Text>
          <Text style={styles.upgradeSub}>Quản lý ngân sách yêu cầu chủ dự án có gói Premium.</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load().then(() => setLoading(false)); }}>
            <Text style={styles.retry}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
        >
          <View style={styles.totals}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Tổng ngân sách</Text>
              <Text style={styles.totalValue}>{formatVnd(b.budget)}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Đã chi</Text>
              <Text style={styles.totalValue}>{formatVnd(b.spent)}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Còn lại</Text>
              <Text style={[styles.totalValue, { color: (b.remaining || 0) < 0 ? colors.rose : colors.emerald }]}>
                {formatVnd(b.remaining)}
              </Text>
            </View>
          </View>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(b.remaining || 0) < 0 ? 100 : usedPct}%`, backgroundColor: (b.remaining || 0) < 0 ? colors.rose : colors.brandBlue }]} />
          </View>

          {error ? <Text style={[styles.err, { marginTop: 12 }]}>{error}</Text> : null}

          {pending.length > 0 ? (
            <>
              <Text style={styles.section}>Chờ duyệt ({pending.length})</Text>
              {pending.map((r) => <RequestCard key={r.id} r={r} />)}
            </>
          ) : null}

          {decided.length > 0 ? (
            <>
              <Text style={styles.section}>Đã xử lý</Text>
              {decided.map((r) => <RequestCard key={r.id} r={r} />)}
            </>
          ) : null}

          {requests.length === 0 ? <Text style={styles.empty}>Chưa có yêu cầu chi tiền nào.</Text> : null}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  err: { color: colors.rose, textAlign: 'center' },
  retry: { color: colors.brandBlue, fontWeight: '700', marginTop: 8 },
  upgradeTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900 },
  upgradeSub: { fontSize: 14, color: colors.slate500, textAlign: 'center', marginTop: 8 },
  totals: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, borderWidth: 1,
    borderColor: colors.slate200, padding: 16,
  },
  totalItem: { flex: 1 },
  totalLabel: { fontSize: 11, color: colors.slate400, fontWeight: '700' },
  totalValue: { fontSize: 15, fontWeight: '800', color: colors.slate900, marginTop: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.slate200, marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  section: { fontSize: 15, fontWeight: '800', color: colors.slate700, marginTop: 22, marginBottom: 10 },
  empty: { color: colors.slate400, marginTop: 20, textAlign: 'center' },
  reqCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200, padding: 14, marginBottom: 10 },
  over: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  reqTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  amount: { fontSize: 17, fontWeight: '800', color: colors.slate900 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  reqLine: { fontSize: 14, color: colors.slate600, marginTop: 3, lineHeight: 20 },
  reqKey: { fontWeight: '700', color: colors.slate500 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveBtn: { backgroundColor: colors.emerald, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, justifyContent: 'center' },
  approveText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  rejectBtn: { backgroundColor: colors.rose, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
  rejectText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  ghostBtn: { borderWidth: 1, borderColor: colors.slate300, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  ghostText: { color: colors.slate600, fontWeight: '700', fontSize: 13 },
  reasonInput: {
    borderWidth: 1, borderColor: colors.slate300, borderRadius: 10, padding: 10, minHeight: 60,
    textAlignVertical: 'top', color: colors.slate900, backgroundColor: colors.white,
  },
});
