USE ComercialLaEstrella;
GO
CREATE OR ALTER TRIGGER dbo.trg_desglose_venta_stock
ON dbo.DESGLOSE_VENTA
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM inserted) RETURN;

  -- Nunca asociar detalles nuevos con ventas ya pagadas o anuladas.
  IF EXISTS (
    SELECT 1 FROM inserted i
    INNER JOIN dbo.VENTA v ON v.ID_VEN = i.VENTA_ID_VEN
    WHERE v.ESTADO_VENTA_ID_ES_VEN <> 1
  )
    THROW 51001, 'Solo se pueden agregar detalles a ventas REGISTRADAS', 1;

  IF EXISTS (
    SELECT 1 FROM inserted
    WHERE CANTIDAD_DES_VEN IS NULL OR CANTIDAD_DES_VEN <= 0
       OR PRECIO_UNITARIO_DES_VEN IS NULL OR PRECIO_UNITARIO_DES_VEN < 0
       OR SUBTOTAL_DES_VEN IS NULL OR SUBTOTAL_DES_VEN < 0
       OR ABS(CAST(SUBTOTAL_DES_VEN AS DECIMAL(19,2)) -
              CAST(CANTIDAD_DES_VEN AS DECIMAL(19,2)) * CAST(PRECIO_UNITARIO_DES_VEN AS DECIMAL(19,2))) > 0.001
  )
    THROW 51002, 'Cantidad, precio o subtotal invalido', 1;

  DECLARE @pedido TABLE (
     tienda INT NOT NULL,
     producto INT NOT NULL,
     cantidad BIGINT NOT NULL,
     PRIMARY KEY(tienda, producto)
  );

  INSERT INTO @pedido(tienda, producto, cantidad)
    SELECT v.TIENDA_ID_TI, i.PRODUCTO_ID_PRO, SUM(CAST(i.CANTIDAD_DES_VEN AS BIGINT))
    FROM inserted i
    JOIN dbo.VENTA v ON v.ID_VEN = i.VENTA_ID_VEN
    GROUP BY v.TIENDA_ID_TI, i.PRODUCTO_ID_PRO;

  -- Actualizacion atomica: el WHERE revalida stock bajo bloqueo de escritura.
  UPDATE cat
    SET EXISTENCIA_ACTUAL_CAT_PRO = cat.EXISTENCIA_ACTUAL_CAT_PRO - p.cantidad
  FROM dbo.CATALOGO_PRODUCTO AS cat
  INNER JOIN @pedido AS p
    ON p.tienda = cat.TIENDA_ID_TI AND p.producto = cat.PRODUCTO_ID_PRO
  WHERE cat.EXISTENCIA_ACTUAL_CAT_PRO >= p.cantidad;

  IF @@ROWCOUNT <> (SELECT COUNT(*) FROM @pedido)
    THROW 51003, 'Producto inexistente en la tienda o existencias insuficientes', 1;
END;
GO
