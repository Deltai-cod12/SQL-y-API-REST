const express = require('express');
const router = express.Router();
const reportes = require('../controllers/reportesController');

router.get('/venta-ubicacion', reportes.ventaUbicacion);
router.get('/top-productos', reportes.topProductos);
router.get('/saldos-pendientes', reportes.saldosPendientes);

module.exports = router;
