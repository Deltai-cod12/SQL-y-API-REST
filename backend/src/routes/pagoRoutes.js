const express = require('express');
const router = express.Router();
const pago = require('../controllers/pagoController');
router.get('/', pago.listar);
router.get('/:id', pago.obtener);
router.post('/', pago.crear);
router.put('/:id', pago.actualizar);
router.delete('/:id', pago.eliminar);
module.exports = router;
