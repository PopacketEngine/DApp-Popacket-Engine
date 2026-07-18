// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PoPacketEngine {
    address public admin; // PoPacket Engine
    
    enum Rol { Ninguno, Fundo, Packing, Operador }
    enum Estado { Creado, EnPacking, EnTransito, Rechazado }

    struct Lote {
        string idLote;
        address responsableActual;
        string hashDocumento; // Anclaje de confidencialidad
        int8 temperatura;
        Estado estado;
        uint256 timestamp;
    }

    // Mapeo de roles autorizados
    mapping(address => Rol) public roles;
    // Mapeo del Staking (simulando token PKT con wei/ETH nativo por simplicidad de la PoC)
    mapping(address => uint256) public balancesStaking;
    // Historial de lotes
    mapping(string => Lote) public lotes;

    event LoteRegistrado(string idLote, address fundo);
    event CustodiaActualizada(string idLote, Rol rol, int8 temperatura, Estado estado);
    event SlashingEjecutado(address penalizado, uint256 montoPerdido);

    modifier soloAdmin() {
        require(msg.sender == admin, "Solo el administrador (PoPacket) puede ejecutar esto");
        _;
    }

    modifier requiereRol(Rol _rol) {
        require(roles[msg.sender] == _rol, "No tienes el rol autorizado para esta accion");
        _;
    }

    modifier requiereStaking() {
        require(balancesStaking[msg.sender] > 0, "Debes tener PKT (Staking) bloqueado para operar");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // 1. Gobernanza: Alta de nodos administrada por PoPacket Engine
    function registrarNodo(address _nodo, Rol _rol) external soloAdmin {
        roles[_nodo] = _rol;
    }

    // 2. Garantía Operativa: Depósito de PKT (Staking de cumplimiento)
    function depositarGarantia() external payable {
        require(msg.value > 0, "Debe enviar fondos");
        balancesStaking[msg.sender] += msg.value;
    }

    // 3. Fundo: Iniciación de la transacción (Asset Genesis)
    function registrarCosecha(string memory _idLote, string memory _hashDoc) 
        external 
        requiereRol(Rol.Fundo) 
        requiereStaking 
    {
        lotes[_idLote] = Lote({
            idLote: _idLote,
            responsableActual: msg.sender,
            hashDocumento: _hashDoc,
            temperatura: 0, 
            estado: Estado.Creado,
            timestamp: block.timestamp
        });
        emit LoteRegistrado(_idLote, msg.sender);
    }

    // 4. Packing y Operador: Transferencia y validación de temperatura (0 a 4 grados)
    function transferirCustodia(string memory _idLote, int8 _temperaturaLeida, Rol _miRol) 
        external 
        requiereRol(_miRol) 
        requiereStaking 
    {
        Lote storage lote = lotes[_idLote];
        require(bytes(lote.idLote).length > 0, "El lote no existe");
        require(lote.estado != Estado.Rechazado, "El lote ya fue rechazado previamente");

        lote.responsableActual = msg.sender;
        lote.temperatura = _temperaturaLeida;
        lote.timestamp = block.timestamp;

        // Validación del chaincode y Slashing
        if (_temperaturaLeida < 0 || _temperaturaLeida > 4) {
            lote.estado = Estado.Rechazado;
            _ejecutarSlashing(msg.sender);
        } else {
            lote.estado = _miRol == Rol.Packing ? Estado.EnPacking : Estado.EnTransito;
        }

        emit CustodiaActualizada(_idLote, _miRol, _temperaturaLeida, lote.estado);
    }

    // Ejecución de confiscación
    function _ejecutarSlashing(address _penalizado) internal {
        uint256 penalidad = balancesStaking[_penalizado] / 10; // Confisca 10% por PoC
        balancesStaking[_penalizado] -= penalidad;
        
        // El 70% iría al afectado y 30% al pool del consorcio en producción
        emit SlashingEjecutado(_penalizado, penalidad);
    }

    // 5. Comprador: Lectura pública sin requerir wallet ni rol
    function consultarLote(string memory _idLote) external view returns (Lote memory) {
        return lotes[_idLote];
    }
}