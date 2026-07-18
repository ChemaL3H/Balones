import { db } from "./firebase.js";
import { ref, set, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const form = document.getElementById('encuestaForm');
const formSec = document.getElementById('form-sec');
const qrContainer = document.getElementById('qr-container');
const qrIdText = document.getElementById('qr-id');
const submitBtn = form.querySelector('button[type="submit"]');

// Formato asumido: AA (año ingreso) + 3110 (fijo, IGUAL para las 5 carreras) + 000-999
// Si "3110" varía por carrera, este regex está mal y hay que ajustarlo.
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
    const condicion = document.getElementById('pregunta1').value;

    if (!nombre || !matricula || !carrera) {
        alert('Completa todos los campos.');
        return;
    }

    if (!MATRICULA_REGEX.test(matricula)) {
        alert('Matrícula inválida. Formato esperado: AA3110XXX (ejemplo: 253110603)');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';

    const idCodigoQR = generarId();
    const matriculaRef = ref(db, 'matriculas_activas/' + matricula);

    try {
        // Transacción atómica: solo "reserva" la matrícula si nadie más la tiene
        // reservada en este instante. Esto evita que dos registros simultáneos
        // con la misma matrícula pasen ambos la validación (la misma condición
        // de carrera que ya corregimos en scanner.html).
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

        // Solo si la reserva de matrícula tuvo éxito, se crea el registro completo del préstamo
        await set(ref(db, 'prestamos/' + idCodigoQR), {
            nombre,
            matricula,
            carrera,
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
