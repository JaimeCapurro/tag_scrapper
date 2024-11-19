const fs = require('fs');
const { format } = require('date-fns');
const path = require('path');

function agregarMensaje(mensaje) {
  return `[${format(new Date(), 'HH:mm:ss')}] ${mensaje}\n`;
}
function crearArchivoDeRegistro(portal, contenido) {
  // Obtiene la fecha actual y la formatea como 'yyyy-MM-dd'
  const fechaActual = format(new Date(), 'yyyy-MM-dd_HH:mm:ss');
  const dia = format(new Date(), 'yyyy-MM-dd');

  // Define la ruta de la carpeta donde deseas guardar los archivos de registro
  const carpetaLog = `log/${dia}/${portal}`;

  // Construye el nombre completo del archivo, incluyendo la carpeta
  const nombreArchivo = path.join(carpetaLog, `${portal}_${fechaActual}.log`);

  // Crea las carpetas de forma recursiva si no existen
  try {
    fs.mkdirSync(carpetaLog, { recursive: true });
  } catch (error) {
    console.error('Error al crear la carpeta de registro:', error);
  }

  // Escribe el contenido en el archivo
  fs.writeFile(nombreArchivo, contenido, (error) => {
    if (error) {
      console.error('Error al crear el archivo de registro:', error);
    } else {
      console.log(`Archivo de registro (${nombreArchivo}) creado con éxito.`);
    }
  });
}

module.exports = { crearArchivoDeRegistro, agregarMensaje };
