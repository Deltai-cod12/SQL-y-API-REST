// Tabla y columnas provienen del modelo original, no de las solicitudes HTTP.
// Solo estas entidades simples usan el controlador generico.
module.exports = {
  "cargos": {
    table: "CARGO",
    pk: "ID_CAR",
    columns: {
      ID_CAR: { type: "int" },
      NOMBRE_CAR: { type: "string", max: 50 },
    }
  },
  "categorias": {
    table: "CATEGORIA",
    pk: "ID_CAT",
    columns: {
      ID_CAT: { type: "int" },
      NOMBRE_CAT: { type: "string", max: 50 },
    }
  },
  "marcas": {
    table: "MARCA",
    pk: "ID_MAR",
    columns: {
      ID_MAR: { type: "int" },
      NOMBRE_MAR: { type: "string", max: 50 },
    }
  },
  "metodos-pago": {
    table: "METODO_PAGO",
    pk: "ID_MET_PAG",
    columns: {
      ID_MET_PAG: { type: "int" },
      NOMBRE_MET_PAG: { type: "string", max: 50 },
    }
  },
  "tipos-tienda": {
    table: "TIPO_TIENDA",
    pk: "ID_TIP_TIE",
    columns: {
      ID_TIP_TIE: { type: "int" },
      NOMBRE_TIP_TIE: { type: "string", max: 50 },
    }
  },
  "tipos-identificacion": {
    table: "TIPO_IDENTIFICACION",
    pk: "ID_TIP_IDE",
    columns: {
      ID_TIP_IDE: { type: "int" },
      NOMBRE_TIP_IDE: { type: "string", max: 30 },
    }
  },
  "estados-venta": {
    table: "ESTADO_VENTA",
    pk: "ID_ES_VEN",
    columns: {
      ID_ES_VEN: { type: "int" },
      NOMBRE_ES_VEN: { type: "string", max: 30 },
    }
  },
  "departamentos": {
    table: "DEPARTAMENTO",
    pk: "ID_DEP",
    columns: {
      ID_DEP: { type: "int" },
      NOMBRE_DEP: { type: "string", max: 50 },
      PAIS_ID_PA: { type: "int" },
    }
  },
  "municipios": {
    table: "MUNICIPIO",
    pk: "ID_MUN",
    columns: {
      ID_MUN: { type: "int" },
      NOMBRE_MUN: { type: "string", max: 50 },
      DEPARTAMENTO_ID_DEP: { type: "int" },
    }
  },
  "personas": {
    table: "PERSONA",
    pk: "ID_PER",
    columns: {
      ID_PER: { type: "int" },
      NOMBRE_PER: { type: "string", max: 50 },
      APELLIDO_PER: { type: "string", max: 50 },
      TELEFONO: { type: "string", max: 15 },
      CORREO_PER: { type: "string", max: 100 },
      DIRECCION_PER: { type: "string", max: 150 },
      MUNICIPIO_ID_MUN: { type: "int" },
    }
  },
  "clientes": {
    table: "CLIENTE",
    pk: "ID_CLI",
    columns: {
      ID_CLI: { type: "int" },
      NUMERO_IDENTIFICACION: { type: "string", max: 30 },
      TIPO_IDENTIFICACION_ID_TIP_IDE: { type: "int" },
      PERSONA_ID_PER: { type: "int" },
    }
  },
  "empleados": {
    table: "EMPLEADO",
    pk: "ID_EMP",
    columns: {
      ID_EMP: { type: "int" },
      FECHA_CONTRATACION: { type: "date" },
      PERSONA_ID_PER: { type: "int" },
      CARGO_ID_CAR: { type: "int" },
      TIENDA_ID_TI: { type: "int" },
    }
  },
  "tiendas": {
    table: "TIENDA",
    pk: "ID_TI",
    columns: {
      ID_TI: { type: "int" },
      NOMBRE_TI: { type: "string", max: 100 },
      DIRECCION_TI: { type: "string", max: 150 },
      TELEFONO_TI: { type: "string", max: 15 },
      TIPO_TIENDA_ID_TIP_TIE: { type: "int" },
      MUNICIPIO_ID_MUN: { type: "int" },
    }
  },
  "productos": {
    table: "PRODUCTO",
    pk: "ID_PRO",
    columns: {
      ID_PRO: { type: "int" },
      NOMBRE_PRO: { type: "string", max: 100 },
      DESCRIPCION_PRO: { type: "string", max: 200 },
      CATEGORIA_ID_CAT: { type: "int" },
      MARCA_ID_MAR: { type: "int" },
    }
  },
};
