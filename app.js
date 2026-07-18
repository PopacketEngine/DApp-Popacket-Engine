// PoPacket Engine — app.js
// Conexion Web3 (MetaMask), transacciones on-chain y lectura publica via RPC.
// Ethers.js v6 | Sepolia Testnet

const CONTRATO_DIRECCION = "0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487";
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7"; // 11155111

const ABI = [
    "function registrarNodo(address _nodo, uint8 _rol)",
    "function depositarGarantia() payable",
    "function registrarCosecha(string _idLote, string _hashDoc)",
    "function transferirCustodia(string _idLote, int8 _temperaturaLeida, uint8 _miRol)",
    "function consultarLote(string _idLote) view returns (tuple(string idLote, address responsableActual, string hashDocumento, int8 temperatura, uint8 estado, uint256 timestamp))"
];

const ESTADOS = ["Creado (Origen)", "En Packing", "En Transito", "Rechazado (Cadena Rota)"];

const ESTADO_STYLES = [
    { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)", color: "#059669" },
    { bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.4)", color: "#0284c7" },
    { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.4)", color: "#7c3aed" },
    { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)", color: "#dc2626" }
];

let proveedor, firmante, contrato;
let listenersListos = false;

// ────────────────────────────────────────────────────────────
// Helpers de UI
// ────────────────────────────────────────────────────────────

function setStatus(elId, msg, type) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = "res-output" + (type ? " " + type : "");
}

function shortAddr(addr) {
    if (!addr || addr.length < 10) return addr;
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}

async function conBotonDeshabilitado(btnId, fn) {
    var btn = document.getElementById(btnId);
    if (btn) btn.disabled = true;
    try {
        await fn();
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ────────────────────────────────────────────────────────────
// Ciclo de vida de la wallet: conectar / desconectar / eventos
// ────────────────────────────────────────────────────────────

function actualizarUIConectado(address) {
    var resEl = document.getElementById("resWallet");
    var btnConnect = document.getElementById("btnConnect");
    var btnDisconnect = document.getElementById("btnDisconnect");

    if (resEl) {
        resEl.textContent = "Conectado: " + shortAddr(address);
        resEl.className = "text-xs text-emerald-600 dark:text-emerald-400";
    }
    if (btnConnect) btnConnect.classList.add("hidden");
    if (btnDisconnect) btnDisconnect.classList.remove("hidden");
}

function actualizarUIDesconectado(mensaje, esError) {
    proveedor = null;
    firmante = null;
    contrato = null;

    var resEl = document.getElementById("resWallet");
    var btnConnect = document.getElementById("btnConnect");
    var btnDisconnect = document.getElementById("btnDisconnect");

    if (resEl) {
        resEl.textContent = mensaje || "No conectado";
        resEl.className = "text-xs " + (esError ? "text-red-500 dark:text-red-400" : "text-slate-500 dark:text-slate-400");
    }
    if (btnConnect) btnConnect.classList.remove("hidden");
    if (btnDisconnect) btnDisconnect.classList.add("hidden");
}

async function asegurarRedSepolia() {
    var chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId === SEPOLIA_CHAIN_ID_HEX) return;

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }]
        });
    } catch (switchError) {
        throw new Error("Cambia manualmente a la red Sepolia en MetaMask e intenta de nuevo.");
    }
}

function registrarListenersWallet() {
    if (listenersListos || !window.ethereum) return;
    listenersListos = true;

    window.ethereum.on("accountsChanged", function (accounts) {
        if (!accounts || accounts.length === 0) {
            actualizarUIDesconectado();
        } else {
            conectarWallet();
        }
    });

    window.ethereum.on("chainChanged", function () {
        window.location.reload();
    });
}

async function conectarWallet() {
    try {
        if (!window.ethereum) {
            actualizarUIDesconectado("Instala MetaMask para continuar.", true);
            return;
        }

        await asegurarRedSepolia();

        proveedor = new ethers.BrowserProvider(window.ethereum);
        await proveedor.send("eth_requestAccounts", []);
        firmante = await proveedor.getSigner();
        contrato = new ethers.Contract(CONTRATO_DIRECCION, ABI, firmante);

        var address = await firmante.getAddress();
        actualizarUIConectado(address);
        registrarListenersWallet();
    } catch (error) {
        var msg;
        if (error.code === -32002) {
            msg = "Ya hay una solicitud de conexion abierta en MetaMask. Abre la extension para confirmarla.";
        } else if (error.code === 4001) {
            msg = "Conexion rechazada en MetaMask.";
        } else {
            msg = error.message || "No se pudo conectar con MetaMask.";
        }
        actualizarUIDesconectado("Error: " + msg, true);
    }
}

async function desconectarWallet() {
    try {
        if (window.ethereum && window.ethereum.request) {
            // EIP-2255: revoca el permiso de la wallet si el proveedor lo soporta.
            // Wallets que no lo implementan simplemente ignoran/rechazan la llamada.
            await window.ethereum.request({
                method: "wallet_revokePermissions",
                params: [{ eth_accounts: {} }]
            });
        }
    } catch (e) {
        // No soportado por todas las wallets: el estado local igual se limpia abajo.
    }
    actualizarUIDesconectado();
}

// ────────────────────────────────────────────────────────────
// 1. Admin: Registrar Nodo
// ────────────────────────────────────────────────────────────

async function registrarNodo() {
    await conBotonDeshabilitado("btnRegistrarNodo", async function () {
        var res = "resAlta";
        try {
            var nodo = document.getElementById("direccionNodo").value.trim();
            var rol = document.getElementById("rolNodo").value;

            if (!nodo) { setStatus(res, "Ingresa una direccion de wallet valida.", "error"); return; }
            if (!contrato) { setStatus(res, "Primero conecta tu wallet de administrador.", "error"); return; }

            setStatus(res, "Procesando transaccion...", "loading");

            var tx = await contrato.registrarNodo(nodo, rol);
            await tx.wait();

            setStatus(res, "Nodo autorizado correctamente. TX: " + shortAddr(tx.hash), "success");
        } catch (e) {
            setStatus(res, "Error: " + (e.reason || e.message), "error");
        }
    });
}

// ────────────────────────────────────────────────────────────
// 2. Depositar Garantia (Staking)
// ────────────────────────────────────────────────────────────

async function depositarGarantia() {
    await conBotonDeshabilitado("btnDepositar", async function () {
        var res = "resStaking";
        try {
            var monto = document.getElementById("montoStaking").value;

            if (!monto || parseFloat(monto) <= 0) { setStatus(res, "Ingresa un monto valido mayor a 0.", "error"); return; }
            if (!contrato) { setStatus(res, "Primero conecta tu wallet.", "error"); return; }

            setStatus(res, "Enviando garantia a la blockchain...", "loading");

            var tx = await contrato.depositarGarantia({ value: ethers.parseEther(monto) });
            await tx.wait();

            setStatus(res, "Staking bloqueado exitosamente. Nodo habilitado para operar.", "success");
        } catch (e) {
            setStatus(res, "Error: " + (e.reason || e.message), "error");
        }
    });
}

// ────────────────────────────────────────────────────────────
// 3. Fundo: Registrar Cosecha (Asset Genesis)
// ────────────────────────────────────────────────────────────

async function registrarCosecha() {
    await conBotonDeshabilitado("btnCosecha", async function () {
        var res = "resCosecha";
        try {
            var lote = document.getElementById("idLoteCosecha").value.trim();
            var hash = document.getElementById("hashDocumento").value.trim();

            if (!lote) { setStatus(res, "El ID del lote no puede estar vacio.", "error"); return; }
            if (!hash) { setStatus(res, "El hash del documento es requerido.", "error"); return; }
            if (!contrato) { setStatus(res, "Primero conecta tu wallet.", "error"); return; }

            setStatus(res, "Registrando origen (Asset Genesis) en blockchain...", "loading");

            var tx = await contrato.registrarCosecha(lote, hash);
            await tx.wait();

            setStatus(res, "Cosecha registrada exitosamente. TX: " + shortAddr(tx.hash), "success");
        } catch (e) {
            setStatus(res, "Error: " + (e.reason || e.message), "error");
        }
    });
}

// ────────────────────────────────────────────────────────────
// 4a. Packing: Transferir Custodia
// ────────────────────────────────────────────────────────────

async function transferirCustodia() {
    await conBotonDeshabilitado("btnCustodia", async function () {
        var res = "resCustodia";
        try {
            var lote = document.getElementById("idLoteCustodia").value.trim();
            var temp = parseInt(document.getElementById("tempDatalogger").value);
            var rol = document.getElementById("miRolAsignado").value;

            if (!lote) { setStatus(res, "El ID del lote no puede estar vacio.", "error"); return; }
            if (isNaN(temp)) { setStatus(res, "Ingresa una temperatura valida.", "error"); return; }
            if (!contrato) { setStatus(res, "Primero conecta tu wallet.", "error"); return; }

            setStatus(res, "Validando cadena de frio on-chain...", "loading");

            var tx = await contrato.transferirCustodia(lote, temp, rol);
            await tx.wait();

            if (temp > 4 || temp < 0) {
                setStatus(res, "Temperatura fuera de rango. Lote RECHAZADO y Slashing ejecutado. TX: " + shortAddr(tx.hash), "error");
            } else {
                setStatus(res, "Custodia transferida y cadena de frio intacta. TX: " + shortAddr(tx.hash), "success");
            }
        } catch (e) {
            setStatus(res, "Error: " + (e.reason || e.message), "error");
        }
    });
}

// ────────────────────────────────────────────────────────────
// 4b. Operador Logistico: Transferir Custodia (Rol 3)
// ────────────────────────────────────────────────────────────

async function transferirCustodiaOperador() {
    await conBotonDeshabilitado("btnOperador", async function () {
        var res = "resOperador";
        try {
            var lote = document.getElementById("idLoteOperador").value.trim();
            var temp = parseInt(document.getElementById("tempOperador").value);
            var rol = 3; // siempre Operador Logistico

            if (!lote) { setStatus(res, "El ID del lote no puede estar vacio.", "error"); return; }
            if (isNaN(temp)) { setStatus(res, "Ingresa una temperatura valida.", "error"); return; }
            if (!contrato) { setStatus(res, "Primero conecta tu wallet.", "error"); return; }

            setStatus(res, "Validando temperatura en puerto on-chain...", "loading");

            var tx = await contrato.transferirCustodia(lote, temp, rol);
            await tx.wait();

            if (temp > 4 || temp < 0) {
                setStatus(res, "Temperatura fuera de rango. Lote RECHAZADO y Slashing ejecutado. TX: " + shortAddr(tx.hash), "error");
            } else {
                setStatus(res, "Entrega en puerto validada. Cadena de frio intacta. TX: " + shortAddr(tx.hash), "success");
            }
        } catch (e) {
            setStatus(res, "Error: " + (e.reason || e.message), "error");
        }
    });
}

// ────────────────────────────────────────────────────────────
// 5. Comprador: Consultar Lote (Lectura publica, sin wallet)
// ────────────────────────────────────────────────────────────

async function consultarLote() {
    await conBotonDeshabilitado("btnConsultar", async function () {
        var resEl = document.getElementById("resConsulta");
        if (!resEl) return;

        resEl.innerHTML = '<p class="res-output loading">Consultando blockchain de Sepolia...</p>';

        try {
            var rpcProvider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
            var contratoLectura = new ethers.Contract(CONTRATO_DIRECCION, ABI, rpcProvider);

            var loteId = document.getElementById("idLoteConsulta").value.trim();
            if (!loteId) {
                resEl.innerHTML = '<p class="res-output error">Ingresa un ID de lote para consultar.</p>';
                return;
            }

            var datos = await contratoLectura.consultarLote(loteId);
            if (!datos.idLote) throw new Error("Lote no encontrado en la blockchain.");

            var estadoIdx = Number(datos.estado);
            var estadoLabel = ESTADOS[estadoIdx] || "Desconocido";
            var estadoStyle = ESTADO_STYLES[estadoIdx] || ESTADO_STYLES[0];
            var tempVal = Number(datos.temperatura);
            var fecha = new Date(Number(datos.timestamp) * 1000).toLocaleString("es-PE", {
                year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
            });
            var fueraDeRango = tempVal < 0 || tempVal > 4;
            var tempStyle = fueraDeRango ? ESTADO_STYLES[3] : ESTADO_STYLES[0];

            resEl.innerHTML = [
                '<div class="border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-4">',
                '<div class="flex items-center justify-between flex-wrap gap-2 mb-1">',
                '<span class="text-sm font-semibold text-slate-900 dark:text-slate-100">Lote: ' + datos.idLote + '</span>',
                '<span style="background:' + estadoStyle.bg + ';border:1px solid ' + estadoStyle.border + ';color:' + estadoStyle.color + ';" class="text-xs font-medium px-2.5 py-1 rounded-full">' + estadoLabel + '</span>',
                '</div>',
                '<p class="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">Responsable: ' + datos.responsableActual + '</p>',
                '</div>',

                '<div class="border border-slate-200 dark:border-slate-800 rounded-xl p-5">',
                '<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Linea de tiempo de trazabilidad</p>',
                '<div class="space-y-4">',

                _timelineStep(ESTADO_STYLES[0], "Asset Genesis — Origen del lote", "Lote registrado en blockchain por el fundo productor."),
                _timelineStep(tempStyle, "Temperatura reportada: " + tempVal + "°C",
                    fueraDeRango ? "Fuera de rango — slashing ejecutado sobre el staking del responsable." : "Dentro del rango permitido (0°C – 4°C). Cadena de frio intacta."),
                _timelineStep(estadoStyle, "Estado actual: " + estadoLabel, "Ultimo estado registrado de forma inmutable on-chain."),
                _timelineStep({ bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.4)", color: "#475569" }, fecha, "Sello de tiempo del ultimo bloque de la transaccion."),

                '</div></div>',

                '<div class="mt-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">',
                '<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Hash documental anclado</p>',
                '<p class="text-xs text-slate-600 dark:text-slate-300 font-mono break-all">' + datos.hashDocumento + '</p>',
                '</div>'
            ].join('');
        } catch (e) {
            resEl.innerHTML = '<p class="res-output error">Error: ' + (e.reason || e.message) + '</p>';
        }
    });
}

function _timelineStep(style, title, subtitle) {
    return [
        '<div class="flex items-start gap-3">',
        '<span class="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:' + style.color + ';"></span>',
        '<div>',
        '<p class="text-sm font-medium text-slate-900 dark:text-slate-100">' + title + '</p>',
        '<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">' + subtitle + '</p>',
        '</div>',
        '</div>'
    ].join('');
}
