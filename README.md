# PoPacket Engine B2B

Plataforma descentralizada de trazabilidad para agroexportación (enfocada en Arándanos y Palta Hass). Este sistema de consorcio asegura el cumplimiento estricto de la cadena de frío y realiza penalizaciones automáticas (*slashing*) en la blockchain si se detectan anomalías térmicas durante el transporte.

---

## 🚀 Información de Despliegue

* **Red:** Ethereum Sepolia Testnet
* **Herramientas de Despliegue:** Remix IDE + MetaMask
* **Dirección del Contrato Inteligente:** [`0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487`](https://sepolia.etherscan.io/address/0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487)
* **Versión de Node.js Utilizada:** `22.19.0`
* **URL de la DApp (Producción):** [popacket-engine.automasilabo.space](https://popacket-engine.automasilabo.space)
* **URL del EtherScan del contrato:** [sepolia.etherscan.io/address/0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487](https://sepolia.etherscan.io/address/0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487)
---

## 🛠️ Arquitectura del Sistema

El proyecto consta de una arquitectura ligera y descentralizada compuesta por:

1. **Smart Contract (`popacket-engine.sol`):** 
   * Escrito en Solidity `^0.8.19`.
   * Administra la gobernanza de nodos (roles autorizados).
   * Gestiona depósitos en garantía (Staking de cumplimiento).
   * Valida las lecturas de los registradores de temperatura (*dataloggers*) en tiempo real.
   * Ejecuta penalizaciones automáticas confiscando parte de la garantía si la cadena de frío es vulnerada.

2. **DApp Frontend (`index.html` + `app.js`):**
   * Interfaz de usuario limpia escrita en HTML y Javascript nativo.
   * Integración directa con MetaMask utilizando **Ethers.js (v6)**.
   * Modos de consulta optimizados: lectura pública optimizada a través de un proveedor RPC público, permitiendo a compradores extranjeros auditar el lote sin necesidad de wallet, pagar gas ni poseer tokens.

---

## 👥 Roles y Flujo de Trabajo

El sistema define 4 roles específicos:

| Rol | Descripción | Acciones Clave |
| :--- | :--- | :--- |
| **Administrador (`PoPacket`)** | Dueño/Creador del contrato. | Dar de alta y autorizar direcciones como nodos (`Fundo`, `Packing`, `Operador`). |
| **Fundo** | Productor agrícola / Origen. | Registrar el origen del lote (*Asset Genesis*) asociando un ID de lote y el hash del acuerdo comercial. |
| **Packing / Operador Logístico** | Eslabones de la cadena de custodia. | Registrar la recepción física del lote reportando la temperatura del *datalogger*. |
| **Comprador (Público)** | Destinatario final. | Auditar de forma pública el estado del lote para proceder con la liberación de pagos. |

---

## ❄️ Cadena de Frío y Lógica de Cumplimiento (Slashing)

* **Rango Térmico Permitido (PoC):** `0°C` a `4°C` (óptimo para arándanos).
* **Validación en Consensual:** Cada transferencia de custodia requiere reportar la temperatura actual.
* **Mecanismo de Slashing:** 
  > [!WARNING]
  > Si un nodo con custodia reporta una temperatura menor a `0°C` o mayor a `4°C`, el contrato de forma automática:
  > 1. Cambia el estado del lote a **Rechazado (Cadena Rota)**.
  > 2. Confisca el **10%** del depósito en garantía (Staking) del nodo responsable.

---

## 📂 Estructura del Repositorio

El proyecto mantiene una estructura simple e intuitiva:

```text
├── contract/
│   └── popacket-engine.sol   # Código fuente del Smart Contract (Solidity)
├── assets/
│   └── logo.svg              # Logo / favicon de la DApp
├── app.js                    # Lógica de conexión Web3, transacciones, consultas RPC y acceso a la demo
├── index.html                # Interfaz de usuario de la DApp
├── .gitignore                # Archivos y carpetas a omitir en Git (ej. env)
└── README.md                 # Documentación del proyecto (este archivo)
```

---

## 💻 Requisitos y Configuración Local

### 1. Requisitos Previos

* **Node.js** (v22.19.0 recomendado).
* Navegador Web compatible con la extensión **MetaMask**.
* Cuenta en MetaMask con fondos de prueba en la red Sepolia (Sepolia ETH) si se desea realizar transacciones de escritura.

### 2. Ejecutar la DApp Localmente

Dado que el frontend es una aplicación web estática, puedes servirla localmente usando cualquier servidor estático rápido compatible con Node.

Puedes usar `npx` (incluido con Node.js) para servir la carpeta sin necesidad de instalar dependencias globales:

```bash
# Servir en el puerto local usando 'serve'
npx serve .
```

O si prefieres `http-server`:

```bash
npx http-server .
```

Una vez que el servidor esté corriendo, abre la URL provista (normalmente `http://localhost:3000` o `http://localhost:8080`) en tu navegador con MetaMask habilitado.

---

## 🔗 Funciones Principales de la Interfaz

1. **Conectar MetaMask:** Inicializa el proveedor web3 y asocia la wallet activa.
2. **Registrar Nodo:** (Solo Admin) Agrega nuevas direcciones al consorcio asociando un rol numérico (`1: Fundo`, `2: Packing`, `3: Operador`).
3. **Depositar Garantía:** Permite a los nodos bloquear Sepolia ETH (simulando tokens PKT) para calificar en el flujo de escritura y custodia.
4. **Registrar Cosecha:** Inicializa un lote con un identificador único y el hash documental.
5. **Registrar Temperatura:** Los eslabones autorizados reportan la temperatura y se apropian de la custodia del lote.
6. **Auditar Lote:** Consulta de libre acceso que realiza una lectura directa a la blockchain por RPC público sin costo de gas ni firmas de transacción.

---

## 🧩 Módulos del Proyecto

La interfaz (`index.html`) está organizada en 5 paneles (tabs), cada uno mapeado 1:1 a un rol del contrato. `app.js` expone una función por cada acción de esos paneles, agrupada por responsabilidad:

| Módulo en `app.js` | Función(es) | Panel / Tab | Elemento(s) HTML asociados |
| :--- | :--- | :--- | :--- |
| **Ciclo de vida de wallet** | `conectarWallet()`, `desconectarWallet()`, `registrarListenersWallet()`, `asegurarRedSepolia()` | Header (global, visible en todos los tabs) | `#btnConnect`, `#btnDisconnect`, `#resWallet` |
| **Admin** | `registrarNodo()` | Tab *Admin* | `#direccionNodo`, `#rolNodo`, `#btnRegistrarNodo`, `#resAlta` |
| **Fundo — Staking** | `depositarGarantia()` | Tab *Fundo* | `#montoStaking`, `#btnDepositar`, `#resStaking` |
| **Fundo — Cosecha** | `registrarCosecha()` | Tab *Fundo* | `#idLoteCosecha`, `#hashDocumento`, `#btnCosecha`, `#resCosecha` |
| **Packing** | `transferirCustodia()` | Tab *Packing* | `#idLoteCustodia`, `#tempDatalogger`, `#btnCustodia`, `#resCustodia` |
| **Operador Logístico** | `transferirCustodiaOperador()` | Tab *Logística* | `#idLoteOperador`, `#tempOperador`, `#btnOperador`, `#resOperador` |
| **Comprador / Auditoría** | `consultarLote()` | Tab *Auditoría* | `#idLoteConsulta`, `#btnConsultar`, `#resConsulta` |
| **Helpers compartidos** | `setStatus()`, `shortAddr()`, `conBotonDeshabilitado()`, `_timelineStep()` | — | usados internamente por los módulos anteriores |

**Notas sobre el ciclo de vida de la wallet:**
* `conectarWallet()` primero verifica la red (fuerza el cambio a Sepolia vía `wallet_switchEthereumChain` si es necesario) y solo entonces pide cuentas con `eth_requestAccounts`.
* `registrarListenersWallet()` suscribe `accountsChanged` (reconecta o limpia el estado si el usuario cambia/quita cuentas desde la extensión) y `chainChanged` (recarga la página, patrón recomendado por MetaMask) para que la UI nunca quede desincronizada del estado real de la wallet.
* `desconectarWallet()` limpia el estado local de la DApp (provider/signer/contrato) e intenta revocar el permiso con `wallet_revokePermissions` (EIP-2255); si la wallet no lo soporta, el logout local sigue siendo efectivo dentro de la DApp.
* Cada botón de escritura (`btnRegistrarNodo`, `btnDepositar`, `btnCosecha`, `btnCustodia`, `btnOperador`, `btnConsultar`) se deshabilita mientras su transacción está pendiente (`conBotonDeshabilitado`), evitando envíos duplicados por doble clic.

**Acceso a la demo (login):**

La DApp pide usuario y contraseña antes de mostrar cualquier panel (`iniciarSesion()`, `cerrarSesion()`, `verificarSesion()` en `app.js`). Es un candado del lado del cliente pensado para no dejar la demo abierta a cualquiera que llegue a la URL — **no es un control de seguridad real**: las credenciales viven como texto plano en `app.js` y cualquiera puede leerlas o saltarse el login desde las herramientas de desarrollador del navegador. La autorización que sí importa es la que impone el propio contrato (`soloAdmin`, `requiereRol`, `requiereStaking`); ese login solo decide si el navegador te muestra la interfaz.

> [!NOTE]
> Para cambiar las credenciales, edita el objeto `CREDENCIALES_DEMO` al inicio de `app.js`.

---

## 🖼️ Logo y Favicon

El logo vive en `assets/logo.svg` (un ícono de paquete sobre fondo azul) y se reutiliza en dos lugares: como favicon (`<link rel="icon">` en `index.html`) y como logo del header/login. Al ser un único SVG, cualquier cambio de marca solo requiere reemplazar ese archivo.

---

**Mapeo con el Smart Contract (`contract/popacket-engine.sol`):**

| Función de `app.js` | Función del contrato | Requiere rol | Requiere staking |
| :--- | :--- | :--- | :--- |
| `registrarNodo()` | `registrarNodo(address,uint8)` | Admin (`soloAdmin`) | No |
| `depositarGarantia()` | `depositarGarantia()` | Ninguno | No (es el propio depósito) |
| `registrarCosecha()` | `registrarCosecha(string,string)` | Fundo (1) | Sí |
| `transferirCustodia()` / `transferirCustodiaOperador()` | `transferirCustodia(string,int8,uint8)` | Packing (2) u Operador (3) | Sí |
| `consultarLote()` | `consultarLote(string)` (view) | Ninguno | No |
