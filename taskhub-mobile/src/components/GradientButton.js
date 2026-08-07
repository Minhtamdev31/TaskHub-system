import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../theme';

// Nút CTA gradient thương hiệu (teal -> blue), giống web.
export default function GradientButton({ title, onPress, loading, disabled, colorsArr, style, textStyle }) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[styles.wrap, isDisabled && { opacity: 0.55 }, style]}
    >
      <LinearGradient
        colors={colorsArr || gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.grad}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={[styles.text, textStyle]}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, overflow: 'hidden' },
  grad: { paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
