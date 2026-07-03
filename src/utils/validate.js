exports.validateRegister = (body) => {
  const errors = [];

  // normalize
  const name = body.name?.trim();
  const email = body.email?.toLowerCase().trim();
  const password = body.password;

  // ================= NAME =================
  if (!name || name.length < 2 || name.length > 100) {
    errors.push({
      field: "name",
      message: "ชื่อต้องมีความยาว 2-100 ตัวอักษร",
    });
  }

  // ================= EMAIL =================
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    errors.push({
      field: "email",
      message: "รูปแบบอีเมลไม่ถูกต้อง",
    });
  } else if (email.length > 255) {
    errors.push({
      field: "email",
      message: "อีเมลยาวเกินไป",
    });
  }

  // ================= PASSWORD =================
  const hasLetter = /[a-zA-Z]/.test(password || "");
  const hasNumber = /[0-9]/.test(password || "");

  if (!password || password.length < 8 || !hasLetter || !hasNumber) {
    errors.push({
      field: "password",
      message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวอักษรและตัวเลข",
    });
  }

  return errors;
};