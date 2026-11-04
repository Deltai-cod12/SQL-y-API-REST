const { sql, getPool } = require('../config/database');

const esId = v => /^(?:[1-9]\d*)$/.test(String(v)) && Number(v) <= 2147483647;
const esCantidad = v => Number.isInteger(v) && v > 0 && v <= 9999999999;
const esPrecio = v => (typeof v === 'number' || typeof v === 'string') &&
  /^(?:\d{1,8})(?:\.\d{1,2})?$/.test(String(v));

function errorDetalle(err, res) {
  console.error('Error al modificar desglose:', err.number, err.message);
  const codigos = [err.number, ...(err.precedingErrors || []).map(e => e.number)];
  if (codigos.includes(51001)) return res.status(409).json({ error: 'La venta no esta REGISTRADA' });
  if (codigos.includes(51002)) return res.status(400).json({ error: 'Cantidad, precio o subtotal invalido' });
  if (codigos.includes(51003)) return res.status(409).json({ error: 'Stock insuficiente o inventario no disponible' });
  if (codigos.includes(51004)) return res.status(409).json({ error: 'No se permite cambiar la clave del detalle' });
  if (codigos.includes(547)) return res.status(409).json({ error: 'El detalle tiene registros relacionados' });
  return res.status(500).json({ error: 'Error al procesar el detalle' });
}

function idsValidos(req, res) {
  if (!esId(req.params.venta) || !esId(req.params.producto)) {
    res.status(400).json({ error: 'Identificadores invalidos' });
    return false;
  }
  return true;
}

exports.actualizar = async (req, res) => {
  if (!idsValidos(req, res)) return;
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).sort().join(',') !== 'CANTIDAD_DES_VEN,PRECIO_UNITARIO_DES_VEN' ||
      !esCantidad(body.CANTIDAD_DES_VEN) || !esPrecio(body.PRECIO_UNITARIO_DES_VEN)) {
    return res.status(400).json({ error: 'Enviar CANTIDAD_DES_VEN y PRECIO_UNITARIO_DES_VEN validos' });
  }
  const cantidad = body.CANTIDAD_DES_VEN;
  const precio = Number(body.PRECIO_UNITARIO_DES_VEN);
  const totalCentavos = Math.round(precio * 100) * cantidad;
  if (!Number.isSafeInteger(totalCentavos) || totalCentavos > 9999999999)
    return res.status(400).json({ error: 'Subtotal excede DECIMAL(10,2)' });
  const subtotal = totalCentavos / 100;

  try {
    const pool = await getPool();
    const resultado = await pool.request()
      .input('venta', sql.Int, Number(req.params.venta))
      .input('producto', sql.Int, Number(req.params.producto))
      .input('cantidad', sql.Decimal(10,0), cantidad)
      .input('precio', sql.Decimal(10,2), precio)
      .input('subtotal', sql.Decimal(10,2), subtotal)
      .query(`UPDATE dbo.DESGLOSE_VENTA
              SET CANTIDAD_DES_VEN = @cantidad,
                  PRECIO_UNITARIO_DES_VEN = @precio,
                  SUBTOTAL_DES_VEN = @subtotal
              WHERE VENTA_ID_VEN = @venta AND PRODUCTO_ID_PRO = @producto`);
    if (!resultado.rowsAffected[0]) return res.status(404).json({ error: 'Detalle no encontrado' });
    return res.json({ mensaje: 'Detalle actualizado e inventario ajustado',
      venta: Number(req.params.venta), producto: Number(req.params.producto), cantidad, subtotal });
  } catch (err) { return errorDetalle(err, res); }
};

exports.eliminar = async (req, res) => {
  if (!idsValidos(req, res)) return;
  try {
    const pool = await getPool();
    const resultado = await pool.request()
      .input('venta', sql.Int, Number(req.params.venta))
      .input('producto', sql.Int, Number(req.params.producto))
      .query(`DELETE FROM dbo.DESGLOSE_VENTA
              WHERE VENTA_ID_VEN = @venta AND PRODUCTO_ID_PRO = @producto`);
    if (!resultado.rowsAffected[0]) return res.status(404).json({ error: 'Detalle no encontrado' });
    return res.json({ mensaje: 'Detalle eliminado e inventario restaurado' });
  } catch (err) { return errorDetalle(err, res); }
};
