import { db } from "./firebase.js";
import { ref, set, runTransaction, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const form = document.getElementById('encuestaForm');
const formSec = document.getElementById('form-sec');
const qrContainer = document.getElementById('qr-container');
const qrIdText = document.getElementById('qr-id');
const submitBtn = form.querySelector('button[type="submit"]');

const MATRICULA_REGEX = /^\d{2}3110\d{3}$/;

function generarId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'Q' + timestamp + random;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const matricula = document.getElementById('matricula').value.trim();
    const carrera = document.getElementById('carrera').value;
    const cuatrimestre = document.getElementById('cuatrimestre').value;
    const grupo = document.getElementById('grupo').value;
    const condicion = document.getElementById('pregunta1').value;

    if (!nombre || !matricula || !carrera || !cuatrimestre || !grupo) {
        alert('Completa todos los campos.');
        return;
    }

    if (!MATRICULA_REGEX.test(matricula)) {
        alert('Matrícula inválida. Formato esperado: AA3110XXX (ejemplo: 253110603)');
        return;
    }

    const grado = cuatrimestre + grupo; // ej. "301", "1001"

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';

    const idCodigoQR = generarId();
    const matriculaRef = ref(db, 'matriculas_activas/' + matricula);
    const inventarioRef = ref(db, 'control_inventario/balones_disponibles');

    try {
        // Paso 1: reservar la matrícula (un solo préstamo activo por alumno)
        const resultadoReserva = await runTransaction(matriculaRef, (idExistente) => {
            if (idExistente !== null) {
                return; // abortar: ya hay un préstamo activo con esta matrícula
            }
            return idCodigoQR;
        });

        if (!resultadoReserva.committed) {
            alert('Ya tienes un préstamo activo. Debes devolver el balón antes de solicitar otro.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Generar mi pase QR';
            return;
        }

        // Paso 2: reservar un balón del inventario general.
        // No abortamos manualmente en null: dejamos que la transacción intente
        // siempre, y es la REGLA de validación en Firebase (no este código) la
        // que impide que el contador baje de 0. Ver database.rules.json.
        let resultadoInventario;
        try {
            resultadoInventario = await runTransaction(inventarioRef, (disponibles) => {
                return (disponibles || 0) - 1;
            });
        } catch (errInventario) {
            // La regla de validación rechazó la escritura (no hay balones) o hubo error de red
            resultadoInventario = { committed: false };
        }

        if (!resultadoInventario.committed) {
            // Importante: como ya habíamos reservado la matrícula en el paso 1,
            // hay que liberarla o el alumno queda bloqueado sin haberse llevado nada.
            await remove(matriculaRef);
            alert('No hay balones disponibles en este momento. Intenta más tarde.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Generar mi pase QR';
            return;
        }

        // Paso 3: solo si ambas reservas tuvieron éxito, se crea el registro del préstamo
        await set(ref(db, 'prestamos/' + idCodigoQR), {
            nombre,
            matricula,
            carrera,
            grado,
            condicion_reportada: condicion,
            estado: 0,
            hora_registro: new Date().toISOString()
        });

        formSec.style.display = 'none';
        qrContainer.style.display = 'flex';
        qrIdText.textContent = 'ID: ' + idCodigoQR;

        document.getElementById('qrcode').innerHTML = '';
        new QRCode(document.getElementById('qrcode'), {
            text: idCodigoQR,
            width: 200,
            height: 200
        });

    } catch (err) {
        console.error('Error al registrar el préstamo:', err);
        alert('Hubo un error al registrar tu préstamo. Verifica tu conexión e intenta de nuevo.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generar mi pase QR';
    }
});
