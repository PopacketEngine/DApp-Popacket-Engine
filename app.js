// ================================================================
// PoPacket Engine — app.js
// Web3 logic: MetaMask connection, on-chain transactions, RPC reads
// Ethers.js v6 | Sepolia Testnet
// ================================================================

const CONTRATO_DIRECCION = "0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487";

const ABI = [
    "function registrarNodo(address _nodo, uint8 _rol)",
    "function depositarGarantia() payable",
    "function registrarCosecha(string _idLote, string _hashDoc)",
    "function transferirCustodia(string _idLote, int8 _temperaturaLeida, uint8 _miRol)",
    "function consultarLote(string _idLote) view returns (tuple(string idLote, address responsableActual, string hashDocumento, int8 temperatura, uint8 estado, uint256 timestamp))"
];

// Human-readable estado labels
const ESTADOS = [
    "Creado (Origen)",
    "En Packing",
    "En Transito",
    "Rechazado (Cadena Rota)"
];

// Estado badge styles (Tailwind inline via style tags rendered by JS)
const ESTADO_STYLES = [
    { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", color: "#34d399", icon: "seedling" },
    { bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.35)", color: "#22d3ee", icon: "package" },
    { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.35)", color: "#a78bfa", icon: "truck" },
    { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)",  color: "#f87171", icon: "x-circle" }
];

let proveedor, firmante, contrato;

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/**
 * Set status on a result element with optional CSS class.
 * @param {string} elId
 * @param {string} msg
 * @param {'success'|'error'|'loading'|''} type
 */
function setStatus(elId, msg, type) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = "res-output " + (type || "");
}

/**
 * Shorten a wallet address for display.
 * @param {string} addr
 */
function shortAddr(addr) {
    if (!addr || addr.length < 10) return addr;
    return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// ────────────────────────────────────────────────────────────
// 0. Conectar Wallet (MetaMask)
// ────────────────────────────────────────────────────────────

async function conectarWallet() {
    var resEl = document.getElementById("resWallet");
    try {
        if (!window.ethereum) throw new Error("Instala MetaMask para continuar.");

        proveedor = new ethers.BrowserProvider(window.ethereum);
        await proveedor.send("eth_requestAccounts", []);
        firmante = await proveedor.getSigner();
        contrato = new ethers.Contract(CONTRATO_DIRECCION, ABI, firmante);

        var address = await firmante.getAddress();

        if (resEl) {
            resEl.textContent = "Conectado: " + shortAddr(address);
            resEl.style.color = "#34d399";
        }

        // Update connect button state
        var btn = document.getElementById("btnConnect");
        if (btn) {
            btn.innerHTML = '<span>&#x2705;</span><span class="hidden sm:inline">' + shortAddr(address) + '</span>';
            btn.style.background = "rgba(52,211,153,0.15)";
            btn.style.border = "1px solid rgba(52,211,153,0.3)";
            btn.style.color = "#34d399";
            btn.style.boxShadow = "none";
        }
    } catch (error) {
        if (resEl) {
            resEl.textContent = "Error: " + error.message;
            resEl.style.color = "#f87171";
        }
    }
}

// ────────────────────────────────────────────────────────────
// 1. Admin: Registrar Nodo
// ────────────────────────────────────────────────────────────

async function registrarNodo() {
    var res = "resAlta";
    try {
        var nodo = document.getElementById("direccionNodo").value.trim();
        var rol  = document.getElementById("rolNodo").value;

        if (!nodo) { setStatus(res, "Ingresa una direccion de wallet valida.", "error"); return; }
        if (!contrato) { setStatus(res, "Primero conecta tu wallet de administrador.", "error"); return; }

        setStatus(res, "Procesando transaccion...", "loading");

        var tx = await contrato.registrarNodo(nodo, rol);
        await tx.wait();

        setStatus(res, "Nodo autorizado correctamente. TX: " + shortAddr(tx.hash), "success");
    } catch (e) {
        setStatus(res, "Error: " + (e.reason || e.message), "error");
    }
}

// ────────────────────────────────────────────────────────────
// 2. Depositar Garantia (Staking)
// ────────────────────────────────────────────────────────────

async function depositarGarantia() {
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
}

// ────────────────────────────────────────────────────────────
// 3. Fundo: Registrar Cosecha (Asset Genesis)
// ────────────────────────────────────────────────────────────

async function registrarCosecha() {
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
}

// ────────────────────────────────────────────────────────────
// 4a. Packing: Transferir Custodia
// ────────────────────────────────────────────────────────────

async function transferirCustodia() {
    var res = "resCustodia";
    try {
        var lote = document.getElementById("idLoteCustodia").value.trim();
        var temp = parseInt(document.getElementById("tempDatalogger").value);
        var rol  = document.getElementById("miRolAsignado").value;

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
}

// ────────────────────────────────────────────────────────────
// 4b. Operador Logistico: Transferir Custodia (Rol 3)
// ────────────────────────────────────────────────────────────

async function transferirCustodiaOperador() {
    var res = "resOperador";
    try {
        var lote = document.getElementById("idLoteOperador").value.trim();
        var temp = parseInt(document.getElementById("tempOperador").value);
        var rol  = 3; // always Operador

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
}

// ────────────────────────────────────────────────────────────
// 5. Comprador: Consultar Lote (Lectura publica, sin wallet)
// ────────────────────────────────────────────────────────────

async function consultarLote() {
    var resEl = document.getElementById("resConsulta");
    if (!resEl) return;

    resEl.innerHTML = '<p class="res-output loading">Consultando blockchain de Sepolia...</p>';

    try {
        var rpcProvider  = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        var contratoLectura = new ethers.Contract(CONTRATO_DIRECCION, ABI, rpcProvider);

        var loteId = document.getElementById("idLoteConsulta").value.trim();
        if (!loteId) {
            resEl.innerHTML = '<p class="res-output error">Ingresa un ID de lote para consultar.</p>';
            return;
        }

        var datos = await contratoLectura.consultarLote(loteId);

        if (!datos.idLote) throw new Error("Lote no encontrado en la blockchain.");

        var estadoIdx   = Number(datos.estado);
        var estadoLabel = ESTADOS[estadoIdx] || "Desconocido";
        var estadoStyle = ESTADO_STYLES[estadoIdx] || ESTADO_STYLES[0];
        var tempVal     = Number(datos.temperatura);
        var fecha       = new Date(Number(datos.timestamp) * 1000).toLocaleString("es-PE", {
            year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
        var esFueraDeFrio = tempVal < 0 || tempVal > 4;
        var tempColor = esFueraDeFrio ? "#f87171" : "#34d399";

        // Build premium timeline result HTML
        resEl.innerHTML = [
            '<div style="animation: fadeSlideIn 0.3s ease forwards;">',

            // Header card
            '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;margin-bottom:16px;">',
            '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:4px;">',
            '<div style="display:flex;align-items:center;gap:10px;">',
            '<span style="font-size:1.2em;">&#x1F4CB;</span>',
            '<span style="font-size:1rem;font-weight:700;color:#f1f5f9;">Lote: ' + datos.idLote + '</span>',
            '</div>',
            '<span style="background:' + estadoStyle.bg + ';border:1px solid ' + estadoStyle.border + ';color:' + estadoStyle.color + ';font-size:0.7rem;font-weight:600;padding:4px 12px;border-radius:999px;letter-spacing:0.03em;">' + estadoLabel + '</span>',
            '</div>',
            '<p style="font-size:0.7rem;color:#64748b;font-family:monospace;word-break:break-all;">Responsable: ' + datos.responsableActual + '</p>',
            '</div>',

            // Timeline
            '<div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;">',
            '<p style="font-size:0.7rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:20px;">Linea de Tiempo de Trazabilidad</p>',

            '<div style="position:relative;padding-left:28px;">',
            '<div style="position:absolute;left:11px;top:8px;bottom:8px;width:2px;background:linear-gradient(to bottom,#34d399,#22d3ee,#8b5cf6);border-radius:2px;opacity:0.4;"></div>',

            // Step 1: Genesis
            _timelineStep("&#x1F33F;", "#34d399", "rgba(52,211,153,0.2)", "rgba(52,211,153,0.4)", "1. Asset Genesis — Origen del Lote",
                "Lote registrado en blockchain por el fundo productor.", null, null, true),

            // Step 2: Temperatura
            _timelineStep("&#x1F321;&#xFE0F;", tempColor, "rgba(52,211,153,0.1)", "rgba(52,211,153,0.3)",
                "2. Temperatura Reportada",
                "Lectura del datalogger registrada on-chain.",
                "Temperatura: " + tempVal + "&deg;C",
                esFueraDeFrio
                    ? '<span style="color:#f87171;font-weight:600;">&#x26A0; Fuera de rango &mdash; Slashing ejecutado</span>'
                    : '<span style="color:#34d399;font-weight:600;">&#x2705; Cadena de frio intacta (0&deg;C &ndash; 4&deg;C)</span>',
                true),

            // Step 3: Estado final
            _timelineStep(
                estadoIdx === 3 ? "&#x274C;" : "&#x2705;",
                estadoStyle.color,
                estadoStyle.bg,
                estadoStyle.border,
                "3. Estado Actual del Lote",
                "Ultimo estado registrado de forma inmutable on-chain.",
                estadoLabel,
                null,
                true),

            // Step 4: Sello de tiempo
            _timelineStep("&#x23F0;", "#a78bfa", "rgba(139,92,246,0.1)", "rgba(139,92,246,0.3)",
                "4. Sello de Tiempo Inmutable",
                "Timestamp del ultimo bloque de la transaccion.",
                fecha,
                null, false),

            '</div>',

            // Hash documental
            '<div style="margin-top:20px;padding:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;">',
            '<p style="font-size:0.65rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Hash Documental Anclado (AES-256)</p>',
            '<p style="font-size:0.65rem;color:#94a3b8;font-family:monospace;word-break:break-all;">' + datos.hashDocumento + '</p>',
            '</div>',

            '</div>',
            '</div>'
        ].join('');

        // Re-init Lucide icons for any new SVGs
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (e) {
        resEl.innerHTML = '<p class="res-output error">Error: ' + (e.reason || e.message) + '</p>';
    }
}

/**
 * Build a single timeline step HTML string.
 */
function _timelineStep(emoji, color, bg, border, title, subtitle, badge, extra, withLine) {
    return [
        '<div style="display:flex;align-items:flex-start;gap:14px;' + (withLine ? 'margin-bottom:20px;' : '') + '">',
        '<div style="width:24px;height:24px;border-radius:50%;background:' + bg + ';border:2px solid ' + border + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;z-index:1;font-size:11px;">' + emoji + '</div>',
        '<div style="padding-top:2px;flex:1;">',
        '<p style="font-size:0.75rem;font-weight:600;color:#f1f5f9;margin-bottom:2px;">' + title + '</p>',
        '<p style="font-size:0.68rem;color:#64748b;">' + subtitle + '</p>',
        badge ? '<p style="font-size:0.7rem;color:' + color + ';font-weight:600;margin-top:4px;">' + badge + '</p>' : '',
        extra ? '<p style="font-size:0.7rem;margin-top:4px;">' + extra + '</p>' : '',
        '</div>',
        '</div>'
    ].join('');
}