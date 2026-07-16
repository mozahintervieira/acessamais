import { describe, expect, it } from "vitest";
import { createTeacherAccount, authenticateTeacher, isValidEmail } from "./server/auth-repository";
import { hashPassword, validatePassword, verifyPassword } from "./server/password";

describe("production MVP auth foundation", () => {
  it("validates teacher email before account creation", () => {
    expect(isValidEmail("professor@escola.edu.br")).toBe(true);
    expect(isValidEmail("email-invalido")).toBe(false);
  });

  it("stores passwords as secure hashes instead of plain text", async () => {
    const password = "Senha12345";
    const storedHash = await hashPassword(password);

    expect(storedHash).not.toBe(password);
    expect(storedHash.startsWith("scrypt:")).toBe(true);
    await expect(verifyPassword(password, storedHash)).resolves.toBe(true);
    await expect(verifyPassword("SenhaErrada123", storedHash)).resolves.toBe(false);
  });

  it("requires a minimally safe password", () => {
    expect(validatePassword("curta")).toBe("A senha precisa ter pelo menos 8 caracteres.");
    expect(validatePassword("senhasemnumero")).toBe("Use letras e numeros na senha.");
    expect(validatePassword("Senha123")).toBeNull();
  });

  it("creates and authenticates a teacher with the development fallback when DATABASE_URL is absent", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const email = `professor-${crypto.randomUUID()}@acessa.test`;

    process.env.DATABASE_URL = "";

    try {
      const created = await createTeacherAccount({
        name: "Professor A",
        email,
        password: "Senha12345"
      });
      const authenticated = await authenticateTeacher({ email, password: "Senha12345" });
      const denied = await authenticateTeacher({ email, password: "SenhaIncorreta123" });

      expect(created.email).toBe(email);
      expect(created.role).toBe("TEACHER");
      expect(authenticated?.id).toBe(created.id);
      expect(denied).toBeNull();
    } finally {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });
});
