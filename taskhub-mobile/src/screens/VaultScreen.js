import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import Header from '../components/Header';
import { vaultService, setVaultToken, clearVaultToken, hasVaultToken } from '../api';
import { colors } from '../theme';

// phase: 'loading' | 'setup' | 'locked' | 'unlocked'
export default function VaultScreen() {
  const [phase, setPhase] = useState('loading');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  // PIN gate
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await vaultService.getAll();
      setItems(res.data || []);
      setPhase('unlocked');
    } catch (e) {
      if (e.response?.status === 401) { clearVaultToken(); setPhase('locked'); }
      else setError(e.response?.data?.message || 'Không tải được kho mật khẩu.');
    }
  }, []);

  const init = useCallback(async () => {
    setError('');
    try {
      const res = await vaultService.pinStatus();
      const hasPin = !!res.data?.hasPin;
      if (!hasPin) { setPhase('setup'); return; }
      if (hasVaultToken()) { await fetchList(); } else { setPhase('locked'); }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không kết nối được kho mật khẩu.');
      setPhase('locked');
    }
  }, [fetchList]);

  useEffect(() => { init(); }, [init]);

  const submitPin = async (isSetup) => {
    if (!/^\d{4,12}$/.test(pin)) { setError('PIN cần 4–12 chữ số.'); return; }
    if (isSetup && pin !== confirmPin) { setError('PIN nhập lại không khớp.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = isSetup ? await vaultService.setupPin(pin) : await vaultService.unlock(pin);
      setVaultToken(res.data?.vaultToken);
      setPin(''); setConfirmPin('');
      await fetchList();
    } catch (e) {
      setError(e.response?.data?.message || (isSetup ? 'Thiết lập PIN thất bại.' : 'Mã PIN không đúng.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Màn nhập PIN (setup / unlock) -----
  if (phase === 'setup' || phase === 'locked') {
    const isSetup = phase === 'setup';
    return (
      <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
        <Header title="Kho mật khẩu" />
        <KeyboardAvoidingView style={styles.gate} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.lockIcon}><Text style={{ fontSize: 30 }}>🔒</Text></View>
          <Text style={styles.gateTitle}>{isSetup ? 'Thiết lập mã PIN' : 'Mở khoá kho mật khẩu'}</Text>
          <Text style={styles.gateSub}>
            {isSetup
              ? 'Đặt mã PIN (4–12 chữ số) làm lớp bảo vệ thứ 2 cho kho của bạn.'
              : 'Nhập mã PIN để mở khoá. Phiên mở khoá kéo dài khoảng 15 phút.'}
          </Text>

          {error ? <Text style={styles.err}>{error}</Text> : null}

          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, ''))}
            placeholder="Mã PIN"
            placeholderTextColor={colors.slate400}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={12}
            editable={!submitting}
          />
          {isSetup ? (
            <TextInput
              style={styles.pinInput}
              value={confirmPin}
              onChangeText={(v) => setConfirmPin(v.replace(/\D/g, ''))}
              placeholder="Nhập lại mã PIN"
              placeholderTextColor={colors.slate400}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={12}
              editable={!submitting}
            />
          ) : null}

          <TouchableOpacity
            style={[styles.gateBtn, submitting && { opacity: 0.6 }]}
            onPress={() => submitPin(isSetup)}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.gateBtnText}>{isSetup ? 'Tạo PIN & mở khoá' : 'Mở khoá'}</Text>}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (phase === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
        <Header title="Kho mật khẩu" />
        <View style={styles.center}><ActivityIndicator color={colors.brandBlue} size="large" /></View>
      </View>
    );
  }

  // ----- Đã mở khoá: danh sách -----
  return <VaultList items={items} setItems={setItems} onLock={() => { clearVaultToken(); setPhase('locked'); }} reload={fetchList} />;
}

// Danh sách + thêm/xoá credential
function VaultList({ items, setItems, onLock, reload }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', username: '', password: '', url: '' });
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState({}); // id -> bool
  const [err, setErr] = useState('');

  const save = async () => {
    if (!form.title.trim() || !form.username.trim() || !form.password) {
      setErr('Nhập tên dịch vụ, tên đăng nhập và mật khẩu.');
      return;
    }
    setSaving(true); setErr('');
    try {
      await vaultService.create({
        title: form.title.trim(), username: form.username.trim(), password: form.password, url: form.url.trim(),
      });
      setForm({ title: '', username: '', password: '', url: '' });
      setAdding(false);
      await reload();
    } catch (e) {
      setErr(e.response?.data?.message || 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item) => {
    Alert.alert('Xoá mục này?', item.title, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try {
            await vaultService.remove(item.id);
            setItems((prev) => prev.filter((x) => x.id !== item.id));
          } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.message || 'Không xoá được.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header
        title="Kho mật khẩu"
        subtitle={`${items.length} mục · đã mở khoá`}
        right={<TouchableOpacity onPress={onLock}><Text style={styles.lockLink}>Khoá</Text></TouchableOpacity>}
      />

      <FlatList
        data={items}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View>
            {adding ? (
              <View style={styles.form}>
                {err ? <Text style={styles.err}>{err}</Text> : null}
                <TextInput style={styles.input} placeholder="Tên dịch vụ (vd: Gmail)" placeholderTextColor={colors.slate400}
                  value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
                <TextInput style={styles.input} placeholder="Tên đăng nhập / Email" placeholderTextColor={colors.slate400}
                  autoCapitalize="none" value={form.username} onChangeText={(v) => setForm({ ...form, username: v })} />
                <TextInput style={styles.input} placeholder="Mật khẩu" placeholderTextColor={colors.slate400}
                  value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />
                <TextInput style={styles.input} placeholder="URL (không bắt buộc)" placeholderTextColor={colors.slate400}
                  autoCapitalize="none" value={form.url} onChangeText={(v) => setForm({ ...form, url: v })} />
                <View style={styles.formBtns}>
                  <TouchableOpacity onPress={() => { setAdding(false); setErr(''); }} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={save} style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving}>
                    {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveText}>Lưu</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)} activeOpacity={0.85}>
                <Text style={styles.addText}>＋ Thêm thông tin</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Chưa có thông tin nào. Bấm "Thêm thông tin" để bắt đầu.</Text>}
        renderItem={({ item }) => {
          const shown = !!reveal[item.id];
          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <TouchableOpacity onPress={() => remove(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.del}>Xoá</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldLabel}>Tên đăng nhập</Text>
              <Text style={styles.fieldValue} selectable>{item.username}</Text>
              <Text style={styles.fieldLabel}>Mật khẩu</Text>
              <View style={styles.pwRow}>
                <Text style={styles.fieldValue} selectable>{shown ? item.password : '••••••••••'}</Text>
                <TouchableOpacity onPress={() => setReveal((r) => ({ ...r, [item.id]: !r[item.id] }))}>
                  <Text style={styles.revealLink}>{shown ? 'Ẩn' : 'Hiện'}</Text>
                </TouchableOpacity>
              </View>
              {item.url ? <Text style={styles.url} numberOfLines={1}>{item.url}</Text> : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  lockIcon: {
    width: 66, height: 66, borderRadius: 20, backgroundColor: colors.brandBlue,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  gateTitle: { fontSize: 22, fontWeight: '800', color: colors.slate900 },
  gateSub: { fontSize: 14, color: colors.slate500, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  pinInput: {
    width: '100%', borderWidth: 1, borderColor: colors.slate300, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, letterSpacing: 4,
    textAlign: 'center', backgroundColor: colors.white, marginBottom: 12, color: colors.slate900,
  },
  gateBtn: {
    width: '100%', backgroundColor: colors.brandBlue, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  gateBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  lockLink: { color: colors.brandBlue, fontWeight: '700', fontSize: 14 },
  addBtn: {
    backgroundColor: colors.brandBlue, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 14,
  },
  addText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  form: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200,
    padding: 14, marginBottom: 14,
  },
  input: {
    borderWidth: 1, borderColor: colors.slate300, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.slate900, backgroundColor: colors.white, marginBottom: 10,
  },
  formBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { color: colors.slate500, fontWeight: '700' },
  saveBtn: { backgroundColor: colors.brandBlue, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'center' },
  saveText: { color: colors.white, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.slate400, marginTop: 30 },
  card: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200,
    padding: 16, marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.slate900 },
  del: { color: colors.rose, fontWeight: '700', fontSize: 13 },
  fieldLabel: { fontSize: 11, color: colors.slate400, fontWeight: '700', textTransform: 'uppercase', marginTop: 8 },
  fieldValue: { fontSize: 15, color: colors.slate700, marginTop: 2 },
  pwRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revealLink: { color: colors.brandBlue, fontWeight: '700', fontSize: 13, paddingLeft: 10 },
  url: { fontSize: 13, color: colors.slate400, marginTop: 10 },
  err: { color: colors.rose, fontSize: 13, marginBottom: 8 },
});
