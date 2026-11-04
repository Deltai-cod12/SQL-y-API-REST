#!/usr/bin/env bash
set -Eeuo pipefail

SQLCMD=/opt/mssql-tools18/bin/sqlcmd
SQLSERVER=sqlserver

run_file() {
  local file="$1"
  echo "[db-init] Ejecutando $file"
  "$SQLCMD" -S "$SQLSERVER" -U sa -P "$MSSQL_SA_PASSWORD" -C -b -V 11 -i "$file"
}

run_file /scripts/init.sql
# IMPORTANTE: triggers siempre despues de migrar datos historicos.
run_file /scripts/sql/trigger_inventario.sql
run_file /scripts/sql/trigger_ajuste_inventario.sql
run_file /scripts/sql/trigger_pagos.sql
run_file /scripts/sql/vistas.sql

echo '[db-init] Verificando objetos...'
"$SQLCMD" -S "$SQLSERVER" -U sa -P "$MSSQL_SA_PASSWORD" -C -b -V 11 -d ComercialLaEstrella -Q "
SET NOCOUNT ON;
DECLARE @tablas INT = (SELECT COUNT(*) FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo'));
DECLARE @fks INT = (SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=0 AND is_not_trusted=0);
DECLARE @triggers INT = (SELECT COUNT(*) FROM sys.triggers WHERE is_disabled=0 AND name IN ('trg_desglose_venta_stock','trg_desglose_ajuste_stock','trg_pago_estado_venta'));
DECLARE @vistas INT = (SELECT COUNT(*) FROM sys.views WHERE name IN ('Vista_Ventas_Ubicacion','Vista_Top_Productos','Vista_Saldos_Pendientes'));
SELECT @tablas AS Tablas, @fks AS FKs, @triggers AS TriggersActivos, @vistas AS Vistas;
IF @tablas <> 19 OR @fks <> 22 OR @triggers <> 3 OR @vistas <> 3
    THROW 51100, 'Verificacion de inicializacion incompleta', 1;
"

echo '[db-init] OK: estructura, triggers y vistas instalados.'
