import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// webClientId phải là Web Client ID mà BACKEND chấp nhận (Google:ClientId).
// id_token trả về sẽ có aud = webClientId này -> backend duyệt được.
GoogleSignin.configure({
  webClientId: '523086170118-8hmdpvtjno80u4pp3cq1o6i9vddd7t0b.apps.googleusercontent.com',
});

export { statusCodes, GoogleSignin };

// Mở luồng đăng nhập Google, trả về id_token (hoặc null nếu không lấy được).
export async function getGoogleIdToken() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const info = await GoogleSignin.signIn();
  // Tương thích cả bản mới (info.data.idToken) lẫn bản cũ (info.idToken).
  return info?.data?.idToken || info?.idToken || null;
}
