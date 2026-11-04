const { sql, getPool } = require('../config/database');

const table = 'dbo.CATALOGO_PRODUCTO';
const select = 'TIENDA_ID_TI, PRODUCTO_ID_PRO, PRECIO_VIGENTE_CAT_PRO, EXISTENCIA_ACTUAL_CAT_PRO';
const intId = (v) => /^(?:[1-9]\d*)$/.test(String(v)) && Number(v) <= 2147483647;
const stockOK = (v) => Number.isInteger(v) && v >= 0 && v <= 9999999999;
const priceOK = (v) => (typeof v === 'string' || typeof v === 'number') && /^(?:\d{1,8})(?:\.\d{1,2})?$/.test(String(v)) && Number(v) >= 0;
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const bodyOK = (b, create) => b && typeof b === 'object' && !Array.isArray(b) &&
  Object.keys(b).length > 0 && Object.keys(b).every(k =>
    ['TIENDA_ID_TI','PRODUCTO_ID_PRO','PRECIO_VIGENTE_CAT_PRO','EXISTENCIA_ACTUAL_CAT_PRO'].includes(k)) &&
  (create ? ['TIENDA_ID_TI','PRODUCTO_ID_PRO','PRECIO_VIGENTE_CAT_PRO','EXISTENCIA_ACTUAL_CAT_PRO'].every(k => has(b,k)) :
    Object.keys(b).every(k => !['TIENDA_ID_TI','PRODUCTO_ID_PRO'].includes(k))) &&
  (!has(b,'TIENDA_ID_TI') || intId(b.TIENDA_ID_TI)) &&
  (!has(b,'PRODUCTO_ID_PRO') || intId(b.PRODUCTO_ID_PRO)) &&
  (!has(b,'PRECIO_VIGENTE_CAT_PRO') || priceOK(b.PRECIO_VIGENTE_CAT_PRO)) &&
  (!has(b,'EXISTENCIA_ACTUAL_CAT_PRO') || stockOK(b.EXISTENCIA_ACTUAL_CAT_PRO));

const keysOK = (req) => intId(req.params.tienda) && intId(req.params.producto);
const bindKeys = (request, tienda, producto) => request
  .input('tienda', sql.Int, Number(tienda))
  .input('producto', sql.Int, Number(producto));
function errorResponse(err, res) {
  console.error('Inventario SQL:', err.message);
  if ([2627,2601].includes(err.number)) return res.status(409).json({error:'El producto ya esta registrado en esta tienda'});
  if (err.number === 547) return res.status(409).json({error:'La tienda o producto no existe, o hay referencias que impiden eliminar'});
  if ([515,2628,8114,245].includes(err.number)) return res.status(400).json({error:'Datos invalidos para SQL Server'});
  return res.status(500).json({error:'Error al procesar inventario'});
}
exports.listar = async (req,res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const filters = [];
    if (req.query.tienda !== undefined) {
      if (!intId(req.query.tienda)) return res.status(400).json({error:'Tienda invalida'});
      request.input('tienda',sql.Int,Number(req.query.tienda));
      filters.push('TIENDA_ID_TI = @tienda');
    }
    if (req.query.producto !== undefined) {
      if (!intId(req.query.producto)) return res.status(400).json({error:'Producto invalido'});
      request.input('producto',sql.Int,Number(req.query.producto));
      filters.push('PRODUCTO_ID_PRO = @producto');
    }
    const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
    const result = await request.query(`SELECT ${select} FROM ${table}${where} ORDER BY TIENDA_ID_TI, PRODUCTO_ID_PRO`);
    return res.json(result.recordset);
  } catch(err) { return errorResponse(err,res); }
};
exports.obtener = async (req,res) => {
  if (!keysOK(req)) return res.status(400).json({error:'Identificadores invalidos'});
  try {
    const pool = await getPool();
    const result = await bindKeys(pool.request(),req.params.tienda,req.params.producto)
      .query(`SELECT ${select} FROM ${table} WHERE TIENDA_ID_TI=@tienda AND PRODUCTO_ID_PRO=@producto`);
    if (!result.recordset.length) return res.status(404).json({error:'Registro no encontrado'});
    return res.json(result.recordset[0]);
  } catch(err) { return errorResponse(err,res); }
};
exports.crear = async (req,res) => {
  if (!bodyOK(req.body,true)) return res.status(400).json({error:'Datos invalidos; se requieren tienda, producto, precio y existencia'});
  const b=req.body;
  try {
    const pool=await getPool();
    await bindKeys(pool.request(),b.TIENDA_ID_TI,b.PRODUCTO_ID_PRO)
      .input('precio',sql.Decimal(10,2),Number(b.PRECIO_VIGENTE_CAT_PRO))
      .input('stock',sql.Decimal(10,0),b.EXISTENCIA_ACTUAL_CAT_PRO)
      .query(`INSERT INTO ${table} (TIENDA_ID_TI,PRODUCTO_ID_PRO,PRECIO_VIGENTE_CAT_PRO,EXISTENCIA_ACTUAL_CAT_PRO) VALUES (@tienda,@producto,@precio,@stock)`);
    return res.status(201).json({mensaje:'Producto agregado al catalogo de la tienda'});
  } catch(err) { return errorResponse(err,res); }
};
exports.actualizar = async (req,res) => {
  if (!keysOK(req) || !bodyOK(req.body,false)) return res.status(400).json({error:'Datos invalidos o intento de modificar la clave primaria'});
  try {
    const pool=await getPool();
    const request=bindKeys(pool.request(),req.params.tienda,req.params.producto);
    const updates=[];
    if (has(req.body,'PRECIO_VIGENTE_CAT_PRO')) {
      request.input('precio',sql.Decimal(10,2),Number(req.body.PRECIO_VIGENTE_CAT_PRO));
      updates.push('PRECIO_VIGENTE_CAT_PRO=@precio');
    }
    if (has(req.body,'EXISTENCIA_ACTUAL_CAT_PRO')) {
      request.input('stock',sql.Decimal(10,0),req.body.EXISTENCIA_ACTUAL_CAT_PRO);
      updates.push('EXISTENCIA_ACTUAL_CAT_PRO=@stock');
    }
    const result=await request.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE TIENDA_ID_TI=@tienda AND PRODUCTO_ID_PRO=@producto`);
    if (!result.rowsAffected[0]) return res.status(404).json({error:'Registro no encontrado'});
    return res.json({mensaje:'Inventario actualizado'});
  } catch(err) { return errorResponse(err,res); }
};
exports.eliminar = async (req,res) => {
  if (!keysOK(req)) return res.status(400).json({error:'Identificadores invalidos'});
  try {
    const pool=await getPool();
    const result=await bindKeys(pool.request(),req.params.tienda,req.params.producto)
      .query(`DELETE FROM ${table} WHERE TIENDA_ID_TI=@tienda AND PRODUCTO_ID_PRO=@producto`);
    if (!result.rowsAffected[0]) return res.status(404).json({error:'Registro no encontrado'});
    return res.json({mensaje:'Producto eliminado del catalogo de la tienda'});
  } catch(err) { return errorResponse(err,res); }
};
