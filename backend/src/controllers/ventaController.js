const { sql, getPool } = require('../config/database');

const esId = v => /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) && Number(v) > 0 && Number(v) <= 2147483647;
const esFecha = v => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
};
const errorSQL = (err, res, operacion) => {
  console.error(`Error ${operacion} venta:`, err);
  if ([2601, 2627].includes(err.number)) return res.status(409).json({ error: 'El ID de venta ya existe' });
  if (err.number === 547) return res.status(409).json({ error: 'Existe una relacion invalida o un conflicto de integridad' });
  return res.status(500).json({ error: `No se pudo ${operacion} la venta` });
};

const listar = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM dbo.VENTA ORDER BY ID_VEN');
    return res.json(result.recordset);
  } catch (e) { return errorSQL(e, res, 'consultar'); }
};

const obtener = async (req, res) => {
  if (!esId(req.params.id)) return res.status(400).json({ error: 'ID invalido' });
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, Number(req.params.id))
      .query('SELECT * FROM dbo.VENTA WHERE ID_VEN = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Venta no encontrada' });
    return res.json(result.recordset[0]);
  } catch (e) { return errorSQL(e, res, 'consultar'); }
};

const crear = async (req, res) => {
  const { ID_VEN, FECHA_VEN, TIENDA_ID_TI, EMPLEADO_ID_EMP, CLIENTE_ID_CLI } = req.body;
  if (![ID_VEN, TIENDA_ID_TI, EMPLEADO_ID_EMP, CLIENTE_ID_CLI].every(esId) || !esFecha(FECHA_VEN))
    return res.status(400).json({ error: 'IDs positivos y FECHA_VEN en formato YYYY-MM-DD son obligatorios' });
  if (Object.prototype.hasOwnProperty.call(req.body, 'ESTADO_VENTA_ID_ES_VEN') && Number(req.body.ESTADO_VENTA_ID_ES_VEN) !== 1)
    return res.status(400).json({ error: 'Una venta nueva debe iniciar REGISTRADA (estado 1)' });
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, Number(ID_VEN))
      .input('fecha', sql.VarChar(10), FECHA_VEN)
      .input('tienda', sql.Int, Number(TIENDA_ID_TI))
      .input('empleado', sql.Int, Number(EMPLEADO_ID_EMP))
      .input('cliente', sql.Int, Number(CLIENTE_ID_CLI))
      .query(`INSERT INTO dbo.VENTA
        (ID_VEN, FECHA_VEN, TIENDA_ID_TI, EMPLEADO_ID_EMP, CLIENTE_ID_CLI, ESTADO_VENTA_ID_ES_VEN)
        VALUES (@id, CONVERT(date, @fecha, 23), @tienda, @empleado, @cliente, 1)`);
    return res.status(201).json({ mensaje: 'Venta registrada', id: Number(ID_VEN), estado: 'REGISTRADA' });
  } catch (e) { return errorSQL(e, res, 'registrar'); }
};

const actualizar = async (req, res) => {
  const { FECHA_VEN, TIENDA_ID_TI, EMPLEADO_ID_EMP, CLIENTE_ID_CLI } = req.body;
  if (!esId(req.params.id) || !esFecha(FECHA_VEN) || ![TIENDA_ID_TI, EMPLEADO_ID_EMP, CLIENTE_ID_CLI].every(esId))
    return res.status(400).json({ error: 'Datos invalidos. Enviar fecha YYYY-MM-DD, tienda, empleado y cliente' });
  if ('ESTADO_VENTA_ID_ES_VEN' in req.body || 'ID_VEN' in req.body)
    return res.status(400).json({ error: 'No se permite modificar ID ni estado desde PUT' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, Number(req.params.id))
      .input('fecha', sql.VarChar(10), FECHA_VEN)
      .input('tienda', sql.Int, Number(TIENDA_ID_TI))
      .input('empleado', sql.Int, Number(EMPLEADO_ID_EMP))
      .input('cliente', sql.Int, Number(CLIENTE_ID_CLI))
      .query(`UPDATE dbo.VENTA
        SET FECHA_VEN = CONVERT(date, @fecha, 23), TIENDA_ID_TI = @tienda,
            EMPLEADO_ID_EMP = @empleado, CLIENTE_ID_CLI = @cliente
        WHERE ID_VEN = @id AND ESTADO_VENTA_ID_ES_VEN = 1
          AND NOT EXISTS (SELECT 1 FROM dbo.DESGLOSE_VENTA WHERE VENTA_ID_VEN = @id)
          AND NOT EXISTS (SELECT 1 FROM dbo.PAGO WHERE VENTA_ID_VEN = @id)`);
    if (result.rowsAffected[0]) return res.json({ mensaje: 'Venta actualizada' });
    const exists = await pool.request().input('id', sql.Int, Number(req.params.id))
      .query('SELECT ID_VEN FROM dbo.VENTA WHERE ID_VEN = @id');
    return exists.recordset.length
      ? res.status(409).json({ error: 'Solo se modifican ventas registradas sin detalles ni pagos' })
      : res.status(404).json({ error: 'Venta no encontrada' });
  } catch (e) { return errorSQL(e, res, 'actualizar'); }
};

const eliminar = async (req, res) => {
  if (!esId(req.params.id)) return res.status(400).json({ error: 'ID invalido' });
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, Number(req.params.id))
      .query(`UPDATE dbo.VENTA SET ESTADO_VENTA_ID_ES_VEN = 3
        WHERE ID_VEN = @id AND ESTADO_VENTA_ID_ES_VEN = 1
          AND NOT EXISTS (SELECT 1 FROM dbo.DESGLOSE_VENTA WHERE VENTA_ID_VEN = @id)
          AND NOT EXISTS (SELECT 1 FROM dbo.PAGO WHERE VENTA_ID_VEN = @id)`);
    if (result.rowsAffected[0]) return res.json({ mensaje: 'Venta anulada', estado: 'ANULADA' });
    const exists = await pool.request().input('id', sql.Int, Number(req.params.id))
      .query('SELECT ID_VEN FROM dbo.VENTA WHERE ID_VEN = @id');
    return exists.recordset.length
      ? res.status(409).json({ error: 'Solo se anulan ventas registradas sin detalles ni pagos' })
      : res.status(404).json({ error: 'Venta no encontrada' });
  } catch (e) { return errorSQL(e, res, 'anular'); }
};
module.exports = { listar, obtener, crear, actualizar, eliminar };
