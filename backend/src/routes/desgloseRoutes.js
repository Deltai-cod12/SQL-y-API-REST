const express = require('express');
const router = express.Router();
const desglose = require('../controllers/desgloseController');
const edicion = require('../controllers/desgloseEdicion');

router.get('/', desglose.listar);
router.get('/:venta/:producto', desglose.obtener);
router.post('/', desglose.crear);
router.put('/:venta/:producto', edicion.actualizar);
router.delete('/:venta/:producto', edicion.eliminar);

module.exports = router;
