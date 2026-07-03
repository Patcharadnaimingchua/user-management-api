// ================= SUCCESS MESSAGES =================
exports.messages = {
  SUCCESS: 'สำเร็จ',
  CREATED: 'สร้างข้อมูลสำเร็จ',
  UPDATED: 'อัปเดตข้อมูลสำเร็จ',
  DELETED: 'ลบข้อมูลสำเร็จ',
  FETCHED: 'ดึงข้อมูลสำเร็จ',

  LOGIN_SUCCESS: 'เข้าสู่ระบบสำเร็จ',
  LOGOUT_SUCCESS: 'ออกจากระบบสำเร็จ',
  REFRESH_SUCCESS: 'ออก access token ใหม่สำเร็จ',
};

// ================= ERROR MESSAGES =================
exports.errors = {
  // auth
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบ',
  FORBIDDEN: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',

  // data
  NOT_FOUND: 'ไม่พบข้อมูล',
  VALIDATION_FAILED: 'ข้อมูลไม่ถูกต้อง',

  // system
  SERVER_ERROR: 'เกิดข้อผิดพลาดในระบบ',

  // auth logic
  INVALID_CREDENTIALS: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  ACCOUNT_DISABLED: 'บัญชีถูกปิดการใช้งาน',

  // token
  INVALID_TOKEN: 'token ไม่ถูกต้อง',
  INVALID_TOKEN_TYPE: 'ประเภท token ไม่ถูกต้อง',
  TOKEN_EXPIRED: 'token หมดอายุ',

  // refresh token
  INVALID_REFRESH_TOKEN: 'refresh token ไม่ถูกต้อง',
  REFRESH_TOKEN_MISMATCH: 'refresh token ไม่ตรงกับระบบ',
  MISSING_REFRESH_TOKEN: 'ไม่มี refresh token',

  // register
  EMAIL_ALREADY_EXISTS: 'อีเมลนี้ถูกใช้งานแล้ว',
};