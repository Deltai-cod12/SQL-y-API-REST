const router = require('express').Router();
const inventario = require('../controllers/inventarioController');
router.get('/', inventario.listar);
router.get('/:tienda/:producto', inventario.obtener);
router.post('/', inventario.crear);
router.put('/:tienda/:producto', inventario.actualizar);
router.delete('/:tienda/:producto', inventario.eliminar);
module.exports = router;
