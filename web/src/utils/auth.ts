// src/utils/auth.ts
import bcrypt from 'bcryptjs';

// Hashea una contraseña usando bcryptjs
export const hashPassword = async (plain: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(plain, saltRounds);
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
