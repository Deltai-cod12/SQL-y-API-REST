const { sql, getPool } = require('../config/database');

const esId = v => /^(?:[1-9]\d*)$/.test(String(v)) && Number(v) <= 2147483647;
const esCantidad = v => Number.isInteger(v) && v > 0 && v <= 2147483647;
const esPrecio = v => (typeof v === 'number' || typeof v === 'string') &&
  /^(?:\d{1,8})(?:\.\d{1,2})?$/.test(String(v));
const esObjeto = v => v && typeof v === 'object' && !Array.isArray(v);

function fallo(err, res) {
  console.error('Error desglose:', err);
  // El driver mssql puede envolver errores de THROW dentro de precedingErrors.
  const nums = [err.number, ...(err.precedingErrors || []).map(e => e.number)];
  if (nums.includes(51003)) return res.status(409).json({ error: 'Producto no disponible o stock insuficiente' });
  if (nums.includes(51001)) return res.status(409).json({ error: 'La venta no esta REGISTRADA' });
  if (nums.includes(51002)) return res.status(400).json({ error: 'Cantidad, precio o subtotal invalido' });
  if (nums.includes(2627) || nums.includes(2601)) return res.status(409).json({ error: 'Este producto ya esta en la venta' });
  if (nums.includes(547)) return res.status(409).json({ error: 'La venta o el producto no existe' });
  return res.status(500).json({ error: 'No se pudo procesar el detalle' });
}

exports.listar = async (req, res) => {
  try {
    const pool = await getPool();
    let request = pool.request();
    let where = '';
    if (req.query.venta !== undefined) {
      if (!esId(req.query.venta)) return res.status(400).json({ error: 'ID de venta invalido' });
      request = request.input('venta', sql.Int, Number(req.query.venta));
      where = ' WHERE VENTA_ID_VEN = @venta';
    }
    const result = await request.query(`SELECT VENTA_ID_VEN, PRODUCTO_ID_PRO, CANTIDAD_DES_VEN,
      PRECIO_UNITARIO_DES_VEN, SUBTOTAL_DES_VEN
      FROM dbo.DESGLOSE_VENTA${where} ORDER BY VENTA_ID_VEN, PRODUCTO_ID_PRO`);
    return res.json(result.recordset);
  } catch (err) { return fallo(err, res); }
};

exports.obtener = async (req, res) => {
  if (!esId(req.params.venta) || !esId(req.params.producto))
    return res.status(400).json({ error: 'Identificadores invalidos' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('venta', sql.Int, Number(req.params.venta))
      .input('producto', sql.Int, Number(req.params.producto))
      .query(`SELECT VENTA_ID_VEN, PRODUCTO_ID_PRO, CANTIDAD_DES_VEN,
        PRECIO_UNITARIO_DES_VEN, SUBTOTAL_DES_VEN FROM dbo.DESGLOSE_VENTA
        WHERE VENTA_ID_VEN = @venta AND PRODUCTO_ID_PRO = @producto`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Detalle no encontrado' });
    return res.json(result.recordset[0]);
  } catch (err) { return fallo(err, res); }
};

exports.crear = async (req, res) => {
  const body = req.body;
  if (!esObjeto(body) || Object.keys(body).sort().join(',') !==
      ['CANTIDAD_DES_VEN', 'PRECIO_UNITARIO_DES_VEN', 'PRODUCTO_ID_PRO', 'VENTA_ID_VEN'].sort().join(',') ||
      !esId(body.VENTA_ID_VEN) || !esId(body.PRODUCTO_ID_PRO) ||
      !esCantidad(body.CANTIDAD_DES_VEN) || !esPrecio(body.PRECIO_UNITARIO_DES_VEN))
    return res.status(400).json({ error: 'Enviar IDs, cantidad positiva y precio decimal valido (maximo 2 decimales)' });

  const venta = Number(body.VENTA_ID_VEN);
  const producto = Number(body.PRODUCTO_ID_PRO);
  const cantidad = body.CANTIDAD_DES_VEN;
  const precio = Number(body.PRECIO_UNITARIO_DES_VEN);
  // Operar en centavos para obtener exactamente dos posiciones decimales.
  const cents = Math.round(precio * 100);
  const totalCents = cents * cantidad;
  if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999)
    return res.status(400).json({ error: 'Subtotal supera el limite DECIMAL(10,2)' });
  const subtotal = totalCents / 100;

  try {
    const pool = await getPool();
    await pool.request()
      .input('venta', sql.Int, venta)
      .input('producto', sql.Int, producto)
      .input('cantidad', sql.Int, cantidad)
      .input('precio', sql.Decimal(10,2), precio)
      .input('subtotal', sql.Decimal(10,2), subtotal)
      .query(`INSERT INTO dbo.DESGLOSE_VENTA
        (VENTA_ID_VEN, PRODUCTO_ID_PRO, CANTIDAD_DES_VEN, PRECIO_UNITARIO_DES_VEN, SUBTOTAL_DES_VEN)
        VALUES (@venta, @producto, @cantidad, @precio, @subtotal)`);
    return res.status(201).json({ mensaje: 'Detalle registrado e inventario descontado',
      venta, producto, cantidad, subtotal });
  } catch (err) { return fallo(err, res); }
};
