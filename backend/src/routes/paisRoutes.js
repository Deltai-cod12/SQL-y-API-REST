
const express = require("express");
const router = express.Router();
const pais = require("../controllers/paisController");

router.get("/", pais.listar);
router.get("/:id", pais.obtener);
router.post("/", pais.crear);
router.put("/:id", pais.actualizar);
router.delete("/:id", pais.eliminar);

module.exports = router;
