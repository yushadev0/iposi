const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** 6-character security code, same alphabet as the original register form. */
export function generateCaptcha(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return out;
}
