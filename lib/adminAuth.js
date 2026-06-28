export function verifyAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return { ok: false, error: "ADMIN_PASSWORD nie jest skonfigurowane na serwerze." };
  }

  if (!password || password !== expected) {
    return { ok: false, error: "Nieprawidłowe hasło." };
  }

  return { ok: true };
}
