import { db } from "./firebase.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const form = document.getElementById('encuestaForm');
const formSec = document.getElementById('form-sec');
const qrContainer = document.getElementById('qr-container');
const qrIdText = document.getElementById('qr-id');
const submitBtn = form.querySelector('button[type="submit"]');

// Genera un ID razonablemente único para el pase. No es infalible (no es UUID v4),
// pero para el volumen de una jaula de balones es suficiente.
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

    submitBtn.disabled = true;
    submitBtn.textContent = 'Generando...';

    const idCodigoQR = generarId();

    try {
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
