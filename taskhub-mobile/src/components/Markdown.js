import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Markdown tối giản đủ cho nội dung AI trả về: tiêu đề (#, ##, ###),
// gạch đầu dòng (* / - / •), danh sách số (1.), và in đậm (**...**).
// Không kéo thêm thư viện native — tự parse để tránh phải build lại vô ích.

// Tách **đậm** trong một dòng thành các <Text> con.
function renderInline(line, keyPrefix) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return (
        <Text key={`${keyPrefix}-b${i}`} style={styles.bold}>
          {p.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={`${keyPrefix}-t${i}`}>{p}</Text>;
  });
}

export default function Markdown({ text, style }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `md-${idx}`;

    if (!line.trim()) {
      blocks.push(<View key={key} style={styles.gap} />);
      return;
    }

    // Tiêu đề: ###, ##, #
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const hStyle = level <= 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
      blocks.push(
        <Text key={key} style={hStyle}>{renderInline(h[2], key)}</Text>
      );
      return;
    }

    // Gạch đầu dòng: *, -, •
    const bullet = line.match(/^\s*[*\-•]\s+(.*)$/);
    if (bullet) {
      blocks.push(
        <View key={key} style={styles.liRow}>
          <Text style={styles.dot}>•</Text>
          <Text style={[styles.li, style]}>{renderInline(bullet[1], key)}</Text>
        </View>
      );
      return;
    }

    // Danh sách số: 1. 2. ...
    const num = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (num) {
      blocks.push(
        <View key={key} style={styles.liRow}>
          <Text style={styles.num}>{num[1]}.</Text>
          <Text style={[styles.li, style]}>{renderInline(num[2], key)}</Text>
        </View>
      );
      return;
    }

    // Đoạn văn thường
    blocks.push(
      <Text key={key} style={[styles.p, style]}>{renderInline(line, key)}</Text>
    );
  });

  return <View>{blocks}</View>;
}

const styles = StyleSheet.create({
  gap: { height: 8 },
  h1: { fontSize: 18, fontWeight: '800', color: colors.slate900, marginTop: 6, marginBottom: 4 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.slate900, marginTop: 6, marginBottom: 4 },
  h3: { fontSize: 15, fontWeight: '800', color: colors.brandBlueDark, marginTop: 6, marginBottom: 2 },
  p: { fontSize: 15, lineHeight: 23, color: colors.slate700, marginBottom: 2 },
  bold: { fontWeight: '800', color: colors.slate900 },
  liRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingLeft: 2 },
  dot: { color: colors.brandBlue, fontSize: 15, lineHeight: 23, marginRight: 8, fontWeight: '800' },
  num: { color: colors.brandBlue, fontSize: 15, lineHeight: 23, marginRight: 8, fontWeight: '800' },
  li: { flex: 1, fontSize: 15, lineHeight: 23, color: colors.slate700 },
});
