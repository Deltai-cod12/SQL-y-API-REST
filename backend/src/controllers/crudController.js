const { sql, getPool } = require("../config/database");
const entities = require("../config/entities");

const allowedInt = (v) => /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 2147483647;
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const getSqlType = (meta) => meta.type === "int" ? sql.Int : meta.type === "decimal" ? sql.Decimal(10, 2) : meta.type === "date" ? sql.DateTime2 : sql.NVarChar(meta.max);

function validValue(v, meta) {
  if (v === null) return true; // NOT NULL se valida con las restricciones del motor.
  if (meta.type === "int") return allowedInt(v);
  if (meta.type === "decimal") return (typeof v === "number" || typeof v === "string") && /^-?\d{1,8}(\.\d{1,2})?$/.test(String(v));
  if (meta.type === "date") return typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) && !Number.isNaN(Date.parse(v));
  return typeof v === "string" && v.length <= meta.max;
}

function bind(request, name, value, meta) {
  return request.input(name, getSqlType(meta), meta.type === "int" && value !== null ? Number(value) : value);
}
function errorResponse(err, res) {
  console.error("CRUD SQL:", err.message);
  if ([2601, 2627].includes(err.number)) return res.status(409).json({ error: "Clave duplicada" });
  if (err.number === 547) return res.status(409).json({ error: "Restriccion de integridad: revise las relaciones" });
  if ([515, 2628, 245, 8114].includes(err.number)) return res.status(400).json({ error: "Datos incompatibles con la tabla" });
  return res.status(500).json({ error: "Error de base de datos" });
}
function makeCrud(entityName) {
  const cfg = entities[entityName];
  if (!cfg) throw new Error("Entidad no configurada");
  const table = `[dbo].[${cfg.table}]`;
  const pk = cfg.pk;
  const pkMeta = cfg.columns[pk];
  const available = Object.keys(cfg.columns);
  const columns = available.map(c => `[${c}]`).join(", ");
  const validate = (body, creating) => {
    if (!isPlainObject(body)) return "El cuerpo debe ser un objeto JSON";
    const keys = Object.keys(body);
    if (!keys.length) return "Debe proporcionar al menos una columna";
    if (creating && !keys.includes(pk)) return `Falta la clave primaria ${pk}`;
    if (!creating && keys.includes(pk)) return "No se permite modificar la clave primaria";
    for (const key of keys) {
      if (!Object.hasOwn(cfg.columns, key)) return `Columna no permitida: ${key}`;
      if (!validValue(body[key], cfg.columns[key])) return `Valor invalido para ${key}`;
    }
    return null;
  };
  const validId = id => allowedInt(id);
  return {
    listar: async (req, res) => {
      try {
        const pool = await getPool();
        const result = await pool.request().query(`SELECT ${columns} FROM ${table} ORDER BY [${pk}]`);
        return res.json(result.recordset);
      } catch(err) { return errorResponse(err, res); }
    },
    obtener: async (req, res) => {
      if (!validId(req.params.id)) return res.status(400).json({ error: "ID invalido" });
      try {
        const pool = await getPool();
        const request = bind(pool.request(), "id", req.params.id, pkMeta);
        const result = await request.query(`SELECT ${columns} FROM ${table} WHERE [${pk}] = @id`);
        if (!result.recordset.length) return res.status(404).json({ error: "Registro no encontrado" });
        return res.json(result.recordset[0]);
      } catch(err) { return errorResponse(err, res); }
    },
    crear: async (req, res) => {
      const message = validate(req.body, true);
      if (message) return res.status(400).json({ error: message });
      try {
        const names = Object.keys(req.body);
        const request = (await getPool()).request();
        names.forEach((name, i) => bind(request, `v${i}`, req.body[name], cfg.columns[name]));
        const sqlText = `INSERT INTO ${table} (${names.map(c => `[${c}]`).join(", ")}) VALUES (${names.map((_,i) => `@v${i}`).join(", ")})`;
        await request.query(sqlText);
        return res.status(201).json({ mensaje: "Registro creado", id: req.body[pk] });
      } catch(err) { return errorResponse(err, res); }
    },
    actualizar: async (req, res) => {
      if (!validId(req.params.id)) return res.status(400).json({ error: "ID invalido" });
      const message = validate(req.body, false);
      if (message) return res.status(400).json({ error: message });
      try {
        const names = Object.keys(req.body);
        const request = bind((await getPool()).request(), "id", req.params.id, pkMeta);
        names.forEach((name,i) => bind(request, `v${i}`, req.body[name], cfg.columns[name]));
        const assignments = names.map((c,i) => `[${c}] = @v${i}`).join(", ");
        const result = await request.query(`UPDATE ${table} SET ${assignments} WHERE [${pk}] = @id`);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: "Registro no encontrado" });
        return res.json({ mensaje: "Registro actualizado" });
      } catch(err) { return errorResponse(err, res); }
    },
    eliminar: async (req, res) => {
      if (!validId(req.params.id)) return res.status(400).json({ error: "ID invalido" });
      try {
        const request = bind((await getPool()).request(), "id", req.params.id, pkMeta);
        const result = await request.query(`DELETE FROM ${table} WHERE [${pk}] = @id`);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: "Registro no encontrado" });
        return res.json({ mensaje: "Registro eliminado" });
      } catch(err) { return errorResponse(err, res); }
    }
  };
}
module.exports = { makeCrud };
