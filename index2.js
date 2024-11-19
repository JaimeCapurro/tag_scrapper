const { crearArchivoDeRegistro, agregarMensaje } = require('./crearLog');
const { enviarCorreo } = require('./mail');

let contenido = '';
contenido += agregarMensaje('Este es el contenido del registro.');
setTimeout(function() {
    contenido += agregarMensaje('salto la linea');
  }, 2000);
  setTimeout(function() {
    contenido += agregarMensaje('xd');
    const portal = 'Ruta Maipo';
    crearArchivoDeRegistro(portal,contenido);
  }, 3000);

//const remitente = 'm.hernandez@grupofirma.cl';
const remitente = 'f.cabello@grupofirma.cl';

const contrasena = 'Firma.158823';
//const destinatarios = ['mamicho444@gmail.com', 'mauhernandez23@cftsa.cl'];
const destinatarios = ['facm.404@gmail.com'];

const dataLog = [
    {
        patente: 'KFDH83',
        concesionario: 'Vespusio Sur',
        estado: 'Finalizado'
    },
    {
        patente: 'KFDH83',
        concesionario: 'Survia',
        estado: 'Error'
    },
]
enviarCorreo(remitente,contrasena ,destinatarios, dataLog);
