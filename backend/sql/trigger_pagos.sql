USE ComercialLaEstrella;
GO

-- Instalar DESPUES de migrar los pagos historicos. No recalcula ventas antiguas.
-- Opera por conjunto sobre INSERT, UPDATE y DELETE.
CREATE OR ALTER TRIGGER dbo.trg_pago_estado_venta
ON dbo.PAGO
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    -- La venta asociada a un pago existente es inmutable en una actualizacion.
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN deleted d ON d.ID_PAG = i.ID_PAG
        WHERE i.VENTA_ID_VEN <> d.VENTA_ID_VEN
    )
        THROW 51024, 'No se permite cambiar la venta asociada a un pago', 1;

    IF EXISTS (SELECT 1 FROM inserted WHERE MONTO_PAG IS NULL OR MONTO_PAG <= 0)
        THROW 51020, 'El monto del pago debe ser mayor que cero', 1;

    DECLARE @Afectadas TABLE (ID_VEN INT PRIMARY KEY);
    INSERT INTO @Afectadas (ID_VEN)
    SELECT VENTA_ID_VEN FROM inserted
    UNION
    SELECT VENTA_ID_VEN FROM deleted;

    -- El bloqueo de las ventas afectadas serializa la validacion de pagos
    -- para una misma venta y protege el estado durante el ajuste.
    DECLARE @Bloqueadas INT;
    SELECT @Bloqueadas = COUNT(*)
    FROM dbo.VENTA v WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN @Afectadas a ON a.ID_VEN = v.ID_VEN;

    IF @Bloqueadas <> (SELECT COUNT(*) FROM @Afectadas)
        THROW 51025, 'No se encontro una venta asociada al pago', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.VENTA v
        JOIN @Afectadas a ON a.ID_VEN = v.ID_VEN
        WHERE v.ESTADO_VENTA_ID_ES_VEN NOT IN (1, 2)
    )
        THROW 51021, 'No se permiten cambios de pagos en ventas anuladas', 1;

    DECLARE @Saldos TABLE (
        ID_VEN INT PRIMARY KEY,
        TOTAL DECIMAL(19,2) NOT NULL,
        PAGADO DECIMAL(19,2) NOT NULL
    );

    INSERT INTO @Saldos (ID_VEN, TOTAL, PAGADO)
    SELECT a.ID_VEN,
           COALESCE(d.TOTAL, 0),
           COALESCE(p.PAGADO, 0)
    FROM @Afectadas a
    OUTER APPLY (
        SELECT SUM(CAST(dv.SUBTOTAL_DES_VEN AS DECIMAL(19,2))) AS TOTAL
        FROM dbo.DESGLOSE_VENTA dv
        WHERE dv.VENTA_ID_VEN = a.ID_VEN
    ) d
    OUTER APPLY (
        SELECT SUM(CAST(pg.MONTO_PAG AS DECIMAL(19,2))) AS PAGADO
        FROM dbo.PAGO pg
        WHERE pg.VENTA_ID_VEN = a.ID_VEN
    ) p;

    -- No permitir registrar pagos para ventas sin productos.
    IF EXISTS (SELECT 1 FROM @Saldos WHERE TOTAL <= 0 AND PAGADO > 0)
        THROW 51022, 'No se puede pagar una venta sin detalles', 1;

    IF EXISTS (SELECT 1 FROM @Saldos WHERE PAGADO > TOTAL)
        THROW 51023, 'El pago supera el total de la venta', 1;

    -- Si se corrige o elimina un abono, revierte a REGISTRADA.
    UPDATE v
       SET ESTADO_VENTA_ID_ES_VEN = CASE
           WHEN s.TOTAL > 0 AND s.PAGADO >= s.TOTAL THEN 2
           ELSE 1
       END
    FROM dbo.VENTA v
    JOIN @Saldos s ON s.ID_VEN = v.ID_VEN
    WHERE v.ESTADO_VENTA_ID_ES_VEN <> CASE
           WHEN s.TOTAL > 0 AND s.PAGADO >= s.TOTAL THEN 2
           ELSE 1
       END;
END;
GO

SELECT t.name AS TriggerNombre, t.is_disabled AS Deshabilitado
FROM sys.triggers AS t
WHERE t.parent_id = OBJECT_ID('dbo.PAGO');
GO
