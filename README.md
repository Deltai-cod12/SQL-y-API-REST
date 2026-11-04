# Comercial La Estrella — Proyecto Fase 2

**Curso:** Bases de Datos 1 — Segundo semestre 2026  
**Universidad:** Universidad de San Carlos de Guatemala, Facultad de Ingeniería  
**Carrera:** Ingeniería en Ciencias y Sistemas  
**Estudiante:** Ángel Emanuel Rodriguez Corado  
**Registro académico:** 202404856

## 1. Descripción

Backend REST para la base de datos **Comercial La Estrella**, migrada desde Oracle a **Microsoft SQL Server 2022**. La infraestructura de base de datos se ejecuta en Docker y la aplicación utiliza **Node.js, Express y `mssql`** para gestionar las entidades mediante peticiones HTTP y respuestas JSON.

El sistema aplica reglas de negocio críticas mediante **triggers de SQL Server** y consultas analíticas mediante **vistas**, evitando realizar estas tareas desde los controladores de Node.js. Todas las altas, bajas, modificaciones y consultas funcionales se realizan mediante la API; las herramientas de base de datos se reservan para la inspección estructural de solo lectura.

## 2. Tecnologías y herramientas

- Docker Desktop y Docker Compose
- Microsoft SQL Server 2022 (`mcr.microsoft.com/mssql/server:2022-latest`)
- Transact-SQL (T-SQL)
- Node.js, Express, `mssql` y `dotenv`
- Postman para pruebas HTTP
- Visual Studio Code (opcional)
- DBeaver (solo para verificación estructural en modo lectura)

## 3. Estructura del proyecto

```text
BD1_ProyectoFase2_202404856/
├── docker-compose.yml
├── init.sql
├── .env                         
├── .env.example                 
├── README.md
├── backend/
│   ├── package.json
│   ├── src/
│   │   └── app.js
│   └── sql/
│       ├── db-init.sh
│       ├── trigger_inventario.sql
│       ├── trigger_ajuste_inventario.sql
│       ├── trigger_pagos.sql
│       └── vistas.sql
├── postman/
│   └── BD1_Comercial_La_Estrella_Fase2.postman_collection.json
└── evidencias/                 
    ├── 01-docker-activo.png
    ├── 02-api-health.png
    ├── 03-stock-insuficiente.png
    ├── 04-stock-antes.png
    ├── 05-stock-despues.png
    ├── 06-venta-registrada.png
    ├── 07-pagos-parciales.png
    └── 08-venta-pagada.png
```

> La estructura muestra los archivos principales. Los controladores, rutas, configuración de conexión y demás módulos del backend se conservan dentro de `backend/` según su organización real. Las imágenes de `evidencias/` **no están incluidas automáticamente**: deben añadirse como capturas auténticas de las pruebas.

## 4. Requisitos previos

1. Tener Docker Desktop **iniciado**, con el motor de contenedores Linux disponible.
2. Tener instalados Node.js y npm.
3. Tener Postman para ejecutar la colección de pruebas.
4. Verificar que los puertos **1433** (SQL Server) y **3000** (API) estén disponibles, de acuerdo con la configuración utilizada.
5. Contar con los archivos del proyecto, incluida la base inicial `init.sql`.

## 5. Variables de entorno

El proyecto utiliza un archivo `.env` para la contraseña del administrador de SQL Server y la configuración de conexión desde Node.js. **No subir contraseñas reales a repositorios públicos ni incorporarlas en el README**.

Antes de ejecutar, revisa el archivo `docker-compose.yml` y el módulo de conexión SQL en `backend/` para configurar **los nombres exactos de las variables que utiliza tu código**. En este proyecto se ha empleado `DB_PASSWORD` en la configuración del backend y `MSSQL_SA_PASSWORD` para la inicialización de SQL Server, según el entorno de Docker.

La contraseña debe cumplir la política de complejidad de SQL Server. Si contiene el carácter `$`, hay que revisar el tratamiento de interpolación en Docker Compose y asegurarse de que el valor leído por el backend coincida con la contraseña efectiva del contenedor.

**No entregues una contraseña real en el archivo `.env.example`**. Si preparas esa plantilla, deja valores de ejemplo y explica cuáles deben sustituirse.

## 6. Levantar la base de datos con Docker

Abrir una terminal **en la raíz del proyecto**:

```powershell
cd "C:\Users\aerod\OneDrive\Documentos\BD1_ProyectoFase2_202404856"
```

Validar la sintaxis de Docker Compose:

```powershell
docker compose config --quiet
```

Iniciar el contenedor de SQL Server y el servicio de inicialización:

```powershell
docker compose up -d
```

Consultar los servicios:

```powershell
docker compose ps -a
```

Revisar los registros de inicialización:

```powershell
docker compose logs db-init
```

Y, si es necesario, los registros del motor:

```powershell
docker compose logs sqlserver
```

**Resultado esperado:** SQL Server operativo y servicio `db-init` finalizado correctamente con código `0` después de instalar/verificar la estructura y los objetos programables.

### Inicialización automática

El archivo `init.sql` crea y carga la estructura relacional de **ComercialLaEstrella**. La inicialización se complementa con `backend/sql/db-init.sh`, encargado de ejecutar los archivos T-SQL correspondientes a triggers y vistas:

1. `init.sql`: creación/carga de las 19 tablas y sus relaciones.
2. `trigger_inventario.sql`: descuento de existencias al insertar detalles.
3. `trigger_ajuste_inventario.sql`: ajustes al modificar o eliminar detalles.
4. `trigger_pagos.sql`: control de pagos y cambio de estado de la venta.
5. `vistas.sql`: creación de las tres vistas analíticas.
6. Validación de objetos esperados: **19 tablas, 22 claves foráneas, 3 triggers y 3 vistas**.

**Advertencia:** no utilizar `docker compose down -v` sobre el proyecto principal, pues elimina los volúmenes y puede borrar los datos persistidos. Para detener los contenedores sin borrar volúmenes:

```powershell
docker compose down
```

Para volver a iniciarlos:

```powershell
docker compose up -d
```

## 7. Ejecutar el backend REST

Con SQL Server listo, abrir **otra terminal** desde la raíz y acceder al backend:

```powershell
cd backend
npm install
```

Iniciar el servidor mediante el archivo principal usado por el proyecto:

```powershell
node src/app.js
```

Si `backend/package.json` contiene un script `start` compatible, también puede usarse `npm start`.

La API utilizada en las pruebas está disponible en **http://localhost:3000**. Para verificar la conexión:

```http
GET http://localhost:3000/api/health
```

En Postman debe recibirse una respuesta correcta indicando que el servicio está disponible. Mantener abierta la terminal del backend mientras se realizan las pruebas.

## 8. Endpoints CRUD

Los módulos implementan **GET (listado y registro individual), POST, PUT y DELETE**, con JSON en las peticiones de creación/actualización. Para tablas con clave compuesta se suministran ambos identificadores en la URL.

| Tabla | Ruta base |
|---|---|
| PAIS | `/api/paises` |
| CARGO | `/api/cargos` |
| CATEGORIA | `/api/categorias` |
| MARCA | `/api/marcas` |
| METODO_PAGO | `/api/metodos-pago` |
| TIPO_TIENDA | `/api/tipos-tienda` |
| TIPO_IDENTIFICACION | `/api/tipos-identificacion` |
| ESTADO_VENTA | `/api/estados-venta` |
| DEPARTAMENTO | `/api/departamentos` |
| MUNICIPIO | `/api/municipios` |
| PERSONA | `/api/personas` |
| CLIENTE | `/api/clientes` |
| EMPLEADO | `/api/empleados` |
| TIENDA | `/api/tiendas` |
| PRODUCTO | `/api/productos` |
| CATALOGO_PRODUCTO | `/api/inventario` |
| VENTA | `/api/ventas` |
| DESGLOSE_VENTA | `/api/desgloses` |
| PAGO | `/api/pagos` |

Ejemplos:

```http
GET    http://localhost:3000/api/productos
GET    http://localhost:3000/api/productos/1
GET    http://localhost:3000/api/inventario/3/103
GET    http://localhost:3000/api/desgloses/9997/103
```

En `VENTA`, la operación DELETE está implementada como **anulación lógica** (estado `ANULADA`), no eliminación física. Para `CATALOGO_PRODUCTO` y `DESGLOSE_VENTA` se utiliza una clave primaria compuesta.

## 9. Triggers y reglas de negocio

### 9.1 Protección de inventario

Los triggers `trg_desglose_venta_stock` y `trg_desglose_ajuste_stock` controlan las existencias de `CATALOGO_PRODUCTO`:

- En un **INSERT** válido de un desglose, se descuentan las unidades vendidas.
- Si la cantidad solicitada supera el stock, SQL Server rechaza la transacción y el inventario no debe alterarse.
- Al actualizar o eliminar un desglose, se corrige o devuelve la existencia que corresponda.

**Prueba de éxito:** consultar el inventario de un producto, crear un desglose válido y volver a consultar su existencia; debe disminuir según la cantidad vendida.

**Prueba de error:** enviar un desglose con cantidad mayor a la disponible; se espera una respuesta de error y el stock debe mantenerse sin cambios.

### 9.2 Estado automático de venta

El trigger `trg_pago_estado_venta` recalcula los pagos asociados a la venta:

- Un **abono parcial** mantiene el estado `REGISTRADA`.
- Al cubrir el **total** de la venta, el estado cambia automáticamente a `PAGADA`.
- Al modificar/eliminar pagos, se recalcula el saldo y el estado correspondiente.
- Se rechazan pagos que superan el total permitido y operaciones no válidas sobre ventas anuladas.

**Prueba:** crear una venta de prueba con detalle, registrar un abono parcial y consultar la venta; posteriormente completar el importe mediante otro pago o una actualización y comprobar que el estado pasa a `PAGADA`.

## 10. Vistas y reportes

Los reportes consultan vistas de SQL Server, en lugar de efectuar los JOIN analíticos complejos en el código de la API:

| Vista | Función | Endpoint |
|---|---|---|
| `Vista_Ventas_Ubicacion` | Cantidad de ventas e importe facturado por ubicación, sin anuladas | `GET /api/reportes/venta-ubicacion` |
| `Vista_Top_Productos` | Productos, categoría, marca, unidades vendidas y monto generado, sin anuladas | `GET /api/reportes/top-productos?limite=10` |
| `Vista_Saldos_Pendientes` | Ventas registradas, abonos y saldo por pagar | `GET /api/reportes/saldos-pendientes` |

## 11. Importar y ejecutar la colección de Postman

La colección se encuentra en:

```text
postman/BD1_Comercial_La_Estrella_Fase2.postman_collection.json
```

Pasos:

1. Abrir Postman y elegir **Import**.
2. Seleccionar el JSON de la carpeta `postman/`.
3. Confirmar que la API se ejecuta en `http://localhost:3000`.
4. Ejecutar primero `/api/health`, después consultas GET y las pruebas funcionales en el orden que corresponda.
5. Para crear o modificar registros, seleccionar **Body → raw → JSON**.
6. Registrar las capturas de respuestas y consultas de verificación.

La colección contiene **21 carpetas y 104 solicitudes**: 95 operaciones CRUD para las 19 tablas, 3 reportes y 6 casos de validación. La colección también contiene operaciones que escriben o eliminan datos; no ejecutar indiscriminadamente todas las solicitudes contra los registros históricos.

### Validaciones documentadas

| Prueba | Comportamiento esperado |
|---|---|
| Stock insuficiente | Rechazar detalle y conservar existencia |
| Pago superior al total | Rechazar el pago |
| Pago negativo | Rechazar importe inválido |
| Clave foránea inexistente | Rechazar referencia inválida |
| GET de ID inexistente | Responder 404 |
| Clave primaria duplicada | Rechazar inserción |

El código HTTP preciso depende del controlador y su manejo del error de SQL Server; la condición indispensable es que la operación inválida sea rechazada y **no corrompa los datos**.

## 12. Evidencia gráfica requerida

**El enunciado exige capturas que evidencien el funcionamiento de los triggers.** Antes de entregar, toma e inserta las capturas reales en `evidencias/`, usando los nombres siguientes o actualizando estas referencias Markdown. No se deben presentar estas rutas como capturas completas mientras los archivos no existan.

### 12.1 Infraestructura Docker


### 12.2 API disponible


### 12.3 Trigger: rechazo por stock insuficiente

Mostrar el POST que devuelve error al solicitar más unidades que las disponibles y comprobar que el stock no cambió.



### 12.4 Trigger: descuento automático de inventario

Mostrar el GET de existencias antes, el POST exitoso de un desglose y el GET después.


### 12.5 Trigger: cambio automático de estado

Mostrar el estado inicial `REGISTRADA`, el abono parcial y el resultado final `PAGADA` después de completar el pago.


## 13. Verificaciones finales y seguridad

- Confirmar que la instancia usada para la evaluación sea **SQL Server 2022 en Docker**.
- Comprobar que el arranque de Docker Compose y `db-init` funcione en una base vacía, de preferencia usando un entorno aislado.
- Confirmar **19 tablas, 22 claves foráneas, 3 triggers habilitados y 3 vistas**.
- Confirmar respuestas correctas de `/api/health`, CRUD y reportes.
- Ejecutar la prueba de stock insuficiente y comprobar que la transacción se revierte.
- Ejecutar una prueba de pago parcial y una de pago completo; comprobar el estado resultante mediante GET.
- Usar **exclusivamente la API REST** para manipular registros durante la evaluación. DBeaver es solo para revisión estructural de lectura.
- Conservar las relaciones del conjunto de datos original y evitar borrar información histórica.
- Excluir `node_modules/`, claves reales, archivos `.env` con credenciales y volúmenes de Docker del archivo de entrega; incluir las instrucciones para configurar el entorno.



