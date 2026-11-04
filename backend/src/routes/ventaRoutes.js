const router = require('express').Router();
const venta = require('../controllers/ventaController');
router.get('/', venta.listar);
router.get('/:id', venta.obtener);
router.post('/', venta.crear);
router.put('/:id', venta.actualizar);
router.delete('/:id', venta.eliminar);
module.exports = router;
