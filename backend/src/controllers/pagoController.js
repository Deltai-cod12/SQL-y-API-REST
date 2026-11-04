const { sql, getPool } = require('../config/database');

const idValido = (valor) => /^\d+$/.test(String(valor)) &&
  Number.isSafeInteger(Number(valor)) && Number(valor) > 0 && Number(valor) <= 2147483647;

const montoValido = (valor) => {
  if (typeof valor !== 'number' && typeof valor !== 'string') return false;
  if (typeof valor === 'string' && !/^\d+(\.\d{1,2})?$/.test(valor)) return false;
  return Number.isFinite(Number(valor)) && Number(valor) > 0 &&
    Number(valor) <= 99999999.99 && Math.round(Number(valor) * 100) / 100 === Number(valor);
};

const errorSQL = (error, res) => {
  const numero = error.number ?? error.originalError?.info?.number;
  if (numero === 51020 || numero === 51021 || numero === 51022 ||
      numero === 51023 || numero === 51024 || numero === 51025) {
    return res.status(409).json({ error: error.message });
  }
  if (numero === 2627 || numero === 2601) {
    return res.status(409).json({ error: 'El ID del pago ya existe' });
  }
  if (numero === 547) {
    return res.status(409).json({ error: 'La venta o el metodo de pago no existe, o hay registros relacionados' });
  }
  console.error('Error PAGO:', { numero, mensaje: error.message });
  return res.status(500).json({ error: 'No se pudo completar la operacion de pago' });
};

const listar = async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    let filtro = '';
    if (req.query.venta !== undefined) {
      if (!idValido(req.query.venta)) return res.status(400).json({ error: 'ID de venta invalido' });
      request.input('venta', sql.Int, Number(req.query.venta));
      filtro = ' WHERE VENTA_ID_VEN = @venta';
    }
    const resultado = await request.query(
      'SELECT ID_PAG, MONTO_PAG, VENTA_ID_VEN, METODO_PAGO_ID_MET_PAG FROM dbo.PAGO' +
      filtro + ' ORDER BY ID_PAG'
    );
    res.json(resultado.recordset);
  } catch (error) { errorSQL(error, res); }
};

const obtener = async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID invalido' });
  try {
    const pool = await getPool();
    const resultado = await pool.request().input('id', sql.Int, Number(req.params.id))
      .query('SELECT ID_PAG, MONTO_PAG, VENTA_ID_VEN, METODO_PAGO_ID_MET_PAG FROM dbo.PAGO WHERE ID_PAG = @id');
    if (!resultado.recordset.length) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(resultado.recordset[0]);
  } catch (error) { errorSQL(error, res); }
};

const crear = async (req, res) => {
  const { ID_PAG, MONTO_PAG, VENTA_ID_VEN, METODO_PAGO_ID_MET_PAG } = req.body ?? {};
  if (!idValido(ID_PAG) || !montoValido(MONTO_PAG) ||
      !idValido(VENTA_ID_VEN) || !idValido(METODO_PAGO_ID_MET_PAG)) {
    return res.status(400).json({ error: 'Enviar ID_PAG, MONTO_PAG positivo, VENTA_ID_VEN y METODO_PAGO_ID_MET_PAG validos' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, Number(ID_PAG))
      .input('monto', sql.Decimal(10,2), Number(MONTO_PAG))
      .input('venta', sql.Int, Number(VENTA_ID_VEN))
      .input('metodo', sql.Int, Number(METODO_PAGO_ID_MET_PAG))
      .query(`INSERT INTO dbo.PAGO (ID_PAG, MONTO_PAG, VENTA_ID_VEN, METODO_PAGO_ID_MET_PAG)
              VALUES (@id, @monto, @venta, @metodo)`);
    return res.status(201).json({ mensaje: 'Pago registrado', id: Number(ID_PAG) });
  } catch (error) { errorSQL(error, res); }
};

const actualizar = async (req, res) => {
  const { MONTO_PAG, METODO_PAGO_ID_MET_PAG } = req.body ?? {};
  if (!idValido(req.params.id) || !montoValido(MONTO_PAG) || !idValido(METODO_PAGO_ID_MET_PAG)) {
    return res.status(400).json({ error: 'Enviar MONTO_PAG positivo y METODO_PAGO_ID_MET_PAG valido' });
  }
  try {
    const pool = await getPool();
    const resultado = await pool.request()
      .input('id', sql.Int, Number(req.params.id))
      .input('monto', sql.Decimal(10,2), Number(MONTO_PAG))
      .input('metodo', sql.Int, Number(METODO_PAGO_ID_MET_PAG))
      .query(`UPDATE dbo.PAGO SET MONTO_PAG = @monto, METODO_PAGO_ID_MET_PAG = @metodo
              WHERE ID_PAG = @id`);
    if (!resultado.rowsAffected[0]) return res.status(404).json({ error: 'Pago no encontrado' });
    return res.json({ mensaje: 'Pago actualizado y estado de venta recalculado' });
  } catch (error) { errorSQL(error, res); }
};

const eliminar = async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID invalido' });
  try {
    const pool = await getPool();
    const resultado = await pool.request().input('id', sql.Int, Number(req.params.id))
      .query('DELETE FROM dbo.PAGO WHERE ID_PAG = @id');
    if (!resultado.rowsAffected[0]) return res.status(404).json({ error: 'Pago no encontrado' });
    return res.json({ mensaje: 'Pago eliminado y estado de venta recalculado' });
  } catch (error) { errorSQL(error, res); }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
