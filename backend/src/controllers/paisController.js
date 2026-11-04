
const { sql, getPool } = require("../config/database");

const validarId = (id) =>
  /^\d+$/.test(String(id)) &&
  Number.isSafeInteger(Number(id)) &&
  Number(id) > 0;

const listar = async (req, res) => {
  try {
    const pool = await getPool();
    const resultado = await pool.request().query(
      "SELECT ID_PA, NOMBRE_PA FROM dbo.PAIS ORDER BY ID_PA"
    );

    res.json(resultado.recordset);
  } catch (error) {
    res.status(500).json({ error: "Error al consultar paises" });
  }
};

const obtener = async (req, res) => {
  if (!validarId(req.params.id)) {
    return res.status(400).json({ error: "ID invalido" });
  }

  try {
    const pool = await getPool();
    const resultado = await pool.request()
      .input("id", sql.Int, Number(req.params.id))
      .query("SELECT * FROM dbo.PAIS WHERE ID_PA = @id");

    if (!resultado.recordset.length) {
      return res.status(404).json({ error: "Pais no encontrado" });
    }

    res.json(resultado.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al consultar pais" });
  }
};

const crear = async (req, res) => {
  const { ID_PA, NOMBRE_PA } = req.body;

  if (!validarId(ID_PA) ||
      typeof NOMBRE_PA !== "string" ||
      !NOMBRE_PA.trim() ||
      NOMBRE_PA.length > 50) {
    return res.status(400).json({ error: "Datos invalidos" });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input("id", sql.Int, Number(ID_PA))
      .input("nombre", sql.NVarChar(50), NOMBRE_PA.trim())
      .query(
        "INSERT INTO dbo.PAIS (ID_PA, NOMBRE_PA) VALUES (@id, @nombre)"
      );

    res.status(201).json({ mensaje: "Pais creado correctamente" });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: "El ID ya existe" });
    }
    res.status(500).json({ error: "Error al crear pais" });
  }
};

const actualizar = async (req, res) => {
  const { NOMBRE_PA } = req.body;

  if (!validarId(req.params.id) ||
      typeof NOMBRE_PA !== "string" ||
      !NOMBRE_PA.trim() ||
      NOMBRE_PA.length > 50) {
    return res.status(400).json({ error: "Datos invalidos" });
  }

  try {
    const pool = await getPool();
    const resultado = await pool.request()
      .input("id", sql.Int, Number(req.params.id))
      .input("nombre", sql.NVarChar(50), NOMBRE_PA.trim())
      .query(
        "UPDATE dbo.PAIS SET NOMBRE_PA = @nombre WHERE ID_PA = @id"
      );

    if (!resultado.rowsAffected[0]) {
      return res.status(404).json({ error: "Pais no encontrado" });
    }

    res.json({ mensaje: "Pais actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar pais" });
  }
};

const eliminar = async (req, res) => {
  if (!validarId(req.params.id)) {
    return res.status(400).json({ error: "ID invalido" });
  }

  try {
    const pool = await getPool();
    const resultado = await pool.request()
      .input("id", sql.Int, Number(req.params.id))
      .query("DELETE FROM dbo.PAIS WHERE ID_PA = @id");

    if (!resultado.rowsAffected[0]) {
      return res.status(404).json({ error: "Pais no encontrado" });
    }

    res.json({ mensaje: "Pais eliminado correctamente" });
  } catch (error) {
    if (error.number === 547) {
      return res.status(409).json({
        error: "No se puede eliminar: existen registros relacionados"
      });
    }
    res.status(500).json({ error: "Error al eliminar pais" });
  }
};

module.exports = {
  listar, obtener, crear, actualizar, eliminar
};
