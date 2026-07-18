// Reemplaza con la dirección de tu contrato desplegado
const direccionContrato = "0xDAcB6b9899eEe47e3A7F83C9CeE1f87D4de60487"; 

// ABI simplificado (Solo las funciones necesarias)
const abi = [
    "function registrarNodo(address _nodo, uint8 _rol)",
    "function depositarGarantia() payable",
    "function registrarCosecha(string _idLote, string _hashDoc)",
    "function transferirCustodia(string _idLote, int8 _temperaturaLeida, uint8 _miRol)",
    "function consultarLote(string _idLote) view returns (tuple(string idLote, address responsableActual, string hashDocumento, int8 temperatura, uint8 estado, uint256 timestamp))"
];

// Mapeo de estados para lectura humana
const ESTADOS = ["Creado (Origen)", "En Packing", "En Tránsito", "Rechazado (Cadena Rota)"];

let proveedor, firmante, contrato;

async function conectarWallet() {
    const res = document.getElementById("resWallet");
    try {
        if (!window.ethereum) throw new Error("Instala MetaMask");
        
        proveedor = new ethers.BrowserProvider(window.ethereum);
        await proveedor.send("eth_requestAccounts", []);
        firmante = await proveedor.getSigner();
        contrato = new ethers.Contract(direccionContrato, abi, firmante);
        
        res.innerText = "Wallet conectada: " + (await firmante.getAddress());
    } catch (error) {
        res.innerText = "Error: " + error.message;
    }
}

async function registrarNodo() {
    const res = document.getElementById("resAlta");
    try {
        const nodo = document.getElementById("direccionNodo").value;
        const rol = document.getElementById("rolNodo").value;
        res.innerText = "Procesando...";
        
        const tx = await contrato.registrarNodo(nodo, rol);
        await tx.wait();
        res.innerText = "Nodo autorizado correctamente.";
    } catch (e) { res.innerText = "Error: " + (e.reason || e.message); }
}

async function depositarGarantia() {
    const res = document.getElementById("resStaking");
    try {
        const monto = document.getElementById("montoStaking").value;
        res.innerText = "Enviando garantía...";
        
        const tx = await contrato.depositarGarantia({ value: ethers.parseEther(monto) });
        await tx.wait();
        res.innerText = "Staking bloqueado. Nodo listo para operar.";
    } catch (e) { res.innerText = "Error: " + (e.reason || e.message); }
}

async function registrarCosecha() {
    const res = document.getElementById("resCosecha");
    try {
        const lote = document.getElementById("idLoteCosecha").value;
        const hash = document.getElementById("hashDocumento").value;
        res.innerText = "Registrando origen (Asset Genesis)...";
        
        const tx = await contrato.registrarCosecha(lote, hash);
        await tx.wait();
        res.innerText = "Cosecha registrada con éxito.";
    } catch (e) { res.innerText = "Error: " + (e.reason || e.message); }
}

async function transferirCustodia() {
    const res = document.getElementById("resCustodia");
    try {
        const lote = document.getElementById("idLoteCustodia").value;
        const temp = parseInt(document.getElementById("tempDatalogger").value);
        const rol = document.getElementById("miRolAsignado").value;
        res.innerText = "Validando cadena de frío...";
        
        const tx = await contrato.transferirCustodia(lote, temp, rol);
        await tx.wait();
        res.innerText = temp > 4 || temp < 0 
            ? "⚠️ Temperatura fuera de rango. Lote rechazado y Slashing ejecutado." 
            : "Custodia transferida y cadena de frío intacta.";
    } catch (e) { res.innerText = "Error: " + (e.reason || e.message); }
}

async function consultarLote() {
    const res = document.getElementById("resConsulta");
    try {
        // Usamos proveedor público para lectura, el comprador no necesita conectar wallet
        const rpcProvider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const contratoLectura = new ethers.Contract(direccionContrato, abi, rpcProvider);
        
        const lote = document.getElementById("idLoteConsulta").value;
        res.innerText = "Consultando blockchain...";
        
        const datos = await contratoLectura.consultarLote(lote);
        
        if (!datos.idLote) throw new Error("Lote no encontrado");

        const fecha = new Date(Number(datos.timestamp) * 1000).toLocaleString();
        
        res.innerHTML = `
            <strong>Lote:</strong> ${datos.idLote} <br>
            <strong>Responsable Actual:</strong> ${datos.responsableActual} <br>
            <strong>Estado:</strong> ${ESTADOS[datos.estado]} <br>
            <strong>Temperatura Reportada:</strong> ${datos.temperatura}°C <br>
            <strong>Hash del Doc Comercial:</strong> ${datos.hashDocumento} <br>
            <strong>Última actualización:</strong> ${fecha}
        `;
    } catch (e) { res.innerText = "Error: " + (e.reason || e.message); }
}