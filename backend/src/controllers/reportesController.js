const { getPool, sql } = require('../config/database');

const manejarError = (error, res) => {
  console.error('Error de reportes:', error.message);
  return res.status(500).json({ error: 'No se pudo consultar el reporte' });
};

const ventaUbicacion = async (req, res) => {
  try {
    const pool = await getPool();
    const { recordset } = await pool.request().query(`
      SELECT ID_TIENDA, TIENDA, MUNICIPIO, DEPARTAMENTO, PAIS,
             CANTIDAD_VENTAS, TOTAL_FACTURADO
      FROM dbo.Vista_Ventas_Ubicacion
      ORDER BY TOTAL_FACTURADO DESC, ID_TIENDA ASC
    `);
    return res.json(recordset);
  } catch (error) { return manejarError(error, res); }
};

const topProductos = async (req, res) => {
  try {
    // Tope opcional 1..100; por defecto 20.
    const limiteTexto = req.query.limite === undefined ? '20' : String(req.query.limite);
    if (!/^\d+$/.test(limiteTexto) || Number(limiteTexto) < 1 || Number(limiteTexto) > 100) {
      return res.status(400).json({ error: 'El limite debe ser un entero entre 1 y 100' });
    }
    const pool = await getPool();
    const { recordset } = await pool.request()
      .input('limite', sql.Int, Number(limiteTexto))
      .query(`
        SELECT TOP (@limite) CODIGO_PRODUCTO, PRODUCTO, CATEGORIA, MARCA,
               UNIDADES_VENDIDAS, MONTO_TOTAL_GENERADO
        FROM dbo.Vista_Top_Productos
        ORDER BY UNIDADES_VENDIDAS DESC, MONTO_TOTAL_GENERADO DESC, CODIGO_PRODUCTO ASC
      `);
    return res.json(recordset);
  } catch (error) { return manejarError(error, res); }
};

const saldosPendientes = async (req, res) => {
  try {
    const pool = await getPool();
    const { recordset } = await pool.request().query(`
      SELECT ID_VENTA, FECHA_VENTA, ID_TIENDA, ID_CLIENTE,
             TOTAL_VENTA, TOTAL_PAGADO, SALDO_PENDIENTE
      FROM dbo.Vista_Saldos_Pendientes
      ORDER BY SALDO_PENDIENTE DESC, ID_VENTA ASC
    `);
    return res.json(recordset);
  } catch (error) { return manejarError(error, res); }
};

module.exports = { ventaUbicacion, topProductos, saldosPendientes };
