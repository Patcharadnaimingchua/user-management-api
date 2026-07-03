const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const { apiLimiter } = require("./middlewares/rateLimit");
const errorHandler = require("./middlewares/error");

const app = express();

// ================= CONFIG =================

// เปิดเฉพาะ production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ================= GLOBAL MIDDLEWARE =================

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// ================= CORS (PRO VERSION) =================
app.use(
  cors({
    origin: true, 
    credentials: true,
  })
);

// Logging
app.use(morgan("dev"));

// JSON limit
app.use(express.json({ limit: "10kb" }));

// Rate limit
app.use("/api", apiLimiter);

// ================= SWAGGER =================

if (process.env.NODE_ENV !== "production") {
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "User Management API",
        version: "1.0.0",
        description:
          "REST API with JWT Authentication, RBAC, Pagination and Filtering",
      },
      servers: [
        {
          url: process.env.BASE_URL || "http://localhost:3000",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    apis: [__dirname + "/routes/*.js"], // FIX docker path
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// ================= ROUTES =================

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

// ================= HEALTH =================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ================= NOT FOUND =================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    timestamp: new Date().toISOString(),
  });
});

// ================= ERROR HANDLER =================

app.use(errorHandler);

// ================= START =================

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;