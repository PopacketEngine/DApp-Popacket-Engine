# PoPacket Engine B2B

Plataforma descentralizada de trazabilidad para agroexportación (enfocada en Arándanos y Palta Hass). Este sistema de consorcio asegura el cumplimiento estricto de la cadena de frío y realiza penalizaciones automáticas (*slashing*) en la blockchain si se detectan anomalías térmicas durante el transporte.

---

## 🚀 Información de Despliegue

* **Red:** Ethereum Sepolia Testnet
* **Herramientas de Despliegue:** Remix IDE + MetaMask
* **Dirección del Contrato Inteligente:** [`0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487`](https://sepolia.etherscan.io/address/0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487)
* **Versión de Node.js Utilizada:** `22.19.0`
* **URL de la DApp (Producción):** [popacket-engine.automasilabo.space](https://popacket-engine.automasilabo.space)

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
├── app.js                    # Lógica de conexión Web3, transacciones y consultas RPC
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
