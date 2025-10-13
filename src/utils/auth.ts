// Hashea una contraseña usando bcryptjs
export const hashPassword = async (plain: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(plain, saltRounds);
};
// Elimina las cookies de autenticación
export const clearAuthCookies = (requestEvent: any) => {
  requestEvent.cookie.delete('auth_token', { path: '/' });
  requestEvent.cookie.delete('user_type', { path: '/' });
  requestEvent.cookie.delete('userId', { path: '/' });
  requestEvent.cookie.delete('userType', { path: '/' });
};
// src/utils/auth.ts
import bcrypt from 'bcryptjs';

export const verifyAuth = async (requestEvent: any) => {
  // Implementation for verifying authentication
  return true; // Placeholder return value
};

export const getUserType = () => {
  // Implementation for getting user type
  return 'normal'; // Placeholder return value
};

// Verifica la contraseña usando bcryptjs
export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
};

// Setea cookies de autenticación (ejemplo simple)
export const setCookies = (requestEvent: any, userId: string, userType: string) => {
  // Puedes personalizar el nombre y valor de las cookies según tu app
  requestEvent.cookie.set('userId', userId, { path: '/', httpOnly: true });
  requestEvent.cookie.set('userType', userType, { path: '/', httpOnly: true });
};
