USE ComercialLaEstrella;
GO
CREATE OR ALTER TRIGGER dbo.trg_desglose_ajuste_stock
ON dbo.DESGLOSE_VENTA
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM deleted) RETURN;

    -- La venta tiene que permanecer registrada mientras cambian sus detalles.
    IF EXISTS (
        SELECT 1 FROM deleted d
        INNER JOIN dbo.VENTA v WITH (UPDLOCK, HOLDLOCK) ON v.ID_VEN = d.VENTA_ID_VEN
        WHERE v.ESTADO_VENTA_ID_ES_VEN <> 1
    )
        THROW 51001, 'Solo se pueden modificar detalles de ventas REGISTRADAS', 1;

    -- Evitar que UPDATE cambie la clave compuesta. DELETE si esta permitido.
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        IF EXISTS (
            SELECT 1 FROM inserted i
            FULL OUTER JOIN deleted d
              ON d.VENTA_ID_VEN = i.VENTA_ID_VEN
             AND d.PRODUCTO_ID_PRO = i.PRODUCTO_ID_PRO
            WHERE i.VENTA_ID_VEN IS NULL OR d.VENTA_ID_VEN IS NULL
        )
            THROW 51004, 'No se permite modificar venta o producto del detalle', 1;

        IF EXISTS (
            SELECT 1 FROM inserted
            WHERE CANTIDAD_DES_VEN IS NULL OR CANTIDAD_DES_VEN <= 0
               OR PRECIO_UNITARIO_DES_VEN IS NULL OR PRECIO_UNITARIO_DES_VEN < 0
               OR SUBTOTAL_DES_VEN IS NULL OR SUBTOTAL_DES_VEN < 0
               OR ABS(CAST(SUBTOTAL_DES_VEN AS DECIMAL(19,2)) -
                  CAST(CANTIDAD_DES_VEN AS DECIMAL(19,2)) *
                  CAST(PRECIO_UNITARIO_DES_VEN AS DECIMAL(19,2))) > 0.001
        )
            THROW 51002, 'Cantidad, precio o subtotal invalido', 1;
    END;

    -- Delta positivo devuelve unidades; negativo necesita descontar unidades.
    -- Se agrupa por tienda y producto para soportar operaciones de varias filas.
    DECLARE @deltas TABLE (
        tienda INT NOT NULL,
        producto INT NOT NULL,
        delta BIGINT NOT NULL,
        PRIMARY KEY (tienda, producto)
    );

    INSERT INTO @deltas (tienda, producto, delta)
    SELECT movimientos.tienda, movimientos.producto, SUM(movimientos.delta)
    FROM (
        SELECT v.TIENDA_ID_TI AS tienda, d.PRODUCTO_ID_PRO AS producto,
               CAST(d.CANTIDAD_DES_VEN AS BIGINT) AS delta
        FROM deleted d
        JOIN dbo.VENTA v ON v.ID_VEN = d.VENTA_ID_VEN
        UNION ALL
        SELECT v.TIENDA_ID_TI AS tienda, i.PRODUCTO_ID_PRO AS producto,
               -CAST(i.CANTIDAD_DES_VEN AS BIGINT) AS delta
        FROM inserted i
        JOIN dbo.VENTA v ON v.ID_VEN = i.VENTA_ID_VEN
    ) AS movimientos
    GROUP BY movimientos.tienda, movimientos.producto
    HAVING SUM(movimientos.delta) <> 0;

    DECLARE @esperadas INT = (SELECT COUNT(*) FROM @deltas);
    IF @esperadas = 0 RETURN;

    UPDATE c
       SET EXISTENCIA_ACTUAL_CAT_PRO = c.EXISTENCIA_ACTUAL_CAT_PRO + d.delta
    FROM dbo.CATALOGO_PRODUCTO c
    INNER JOIN @deltas d
      ON c.TIENDA_ID_TI = d.tienda AND c.PRODUCTO_ID_PRO = d.producto
    WHERE CAST(c.EXISTENCIA_ACTUAL_CAT_PRO AS DECIMAL(19,0)) + d.delta BETWEEN 0 AND 9999999999;

    IF @@ROWCOUNT <> @esperadas
        THROW 51003, 'Producto inexistente en tienda, stock insuficiente o limite de inventario excedido', 1;
END;
GO
