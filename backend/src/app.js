
const express = require("express");
const cors = require("cors");
const { getPool } = require("./config/database");
const paisRoutes = require("./routes/paisRoutes");
const crudRoutes = require("./routes/crudRoutes");
const errorHandler = require("./middleware/errorHandler");
const inventarioRoutes = require("./routes/inventarioRoutes");
const ventaRoutes = require("./routes/ventaRoutes");
const desgloseRoutes = require("./routes/desgloseRoutes");
const pagoRoutes = require("./routes/pagoRoutes");
const reportesRoutes = require("./routes/reportesRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/paises", paisRoutes);
app.use("/api", crudRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/ventas", ventaRoutes);
app.use("/api/desgloses", desgloseRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/reportes", reportesRoutes);

app.get("/api/health", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(
      "SELECT DB_NAME() AS base_datos"
    );

    return res.status(200).json({
      status: "OK",
      mensaje: "API y SQL Server funcionando",
      base_datos: result.recordset[0].base_datos
    });
  } catch (error) {
    console.error("Error de conexion:", error.message);

    return res.status(503).json({
      status: "ERROR",
      mensaje: "No se pudo conectar a SQL Server"
    });
  }
});

app.use(errorHandler);
module.exports = app;
