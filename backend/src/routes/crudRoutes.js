const express = require("express");
const entities = require("../config/entities");
const { makeCrud } = require("../controllers/crudController");
const router = express.Router();

for (const name of Object.keys(entities)) {
  const handlers = makeCrud(name);
  router.get(`/${name}`, handlers.listar);
  router.get(`/${name}/:id`, handlers.obtener);
  router.post(`/${name}`, handlers.crear);
  router.put(`/${name}/:id`, handlers.actualizar);
  router.delete(`/${name}/:id`, handlers.eliminar);
}
module.exports = router;
