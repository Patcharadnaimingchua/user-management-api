const { errors } = require("../utils/messages");

module.exports = (err, req, res, next) => {
  // log เฉพาะ dev
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  // normalize status
  const statusCode = err.statusCode || err.status || 500;

  // ป้องกัน leak message
  let message = err.message;

  if (statusCode === 500) {
    message = errors.SERVER_ERROR;
  }

  // response มาตรฐาน
  res.status(statusCode).json({
    success: false,
    message,
    ...(err.errors && { errors: err.errors }),
    timestamp: new Date().toISOString(),
  });
};