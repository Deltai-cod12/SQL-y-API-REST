function errorHandler(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "JSON invalido" });
  }
  console.error("Error HTTP:", err.message);
  return res.status(500).json({ error: "Error interno" });
}
module.exports = errorHandler;
