const nodemailer = require('nodemailer');
const { format } = require('date-fns');
function htmlEmail(data){
    fecha = format(new Date(), 'yyyy-MM-dd');
    let filasTabla = '';
    data.forEach(element => {
        filasTabla += '<tr>'
        filasTabla += `<td>${element.patente}</td>`;
        filasTabla += `<td>${element.concesionario}</td>`;
        if(element.estado == 'Finalizado'){
            filasTabla += `<td style="color:green" >Finalizado</td>`;
        }else{
            filasTabla += `<td style="color:red">Error</td>`;
        }
        filasTabla += '</tr>';
    });
    return `<h2>Resumen de Ejecución del Bot</h2>
  
    <p>Junto con saludar, se informa a usted que el bot de recopilación de información de tag se ejecutó con fecha ${fecha}</p>
    
    <h2>Información Recopilada</h2>
    
    <table border="1">
      <tr>
        <th>Patente</th>
        <th>Concesionario</th>
        <th>Estado</th>
      </tr>
      ${filasTabla}
    </table>
  
    <p>Este es un resumen de la información recopilada por el bot en varias páginas de tag.</p>
  
    <p>¡Por favor no responder este correo.!</p>`;
}
function enviarCorreo(emailRemitente,contrasena, destinatarios, dataLog) {
  const fecha = format(new Date(), 'yyyy-MM-dd');
  const transporter = nodemailer.createTransport({
    host: 'mail.grupofirma.cl',
    port: 587,
    secure: false,
    auth: {
      user: emailRemitente,
      pass: contrasena,
    },
    tls: { rejectUnauthorized: false },
  });

  // Detalles del correo electrónico
  const mailOptions = {
    from: emailRemitente,
    to: destinatarios.join(', '), // Convierte el array de destinatarios en una lista separada por comas
    subject: `Ejecución del Bot de Tag ${fecha}`,
    //text: cuerpo,
    html: htmlEmail(dataLog)
  };

  // Enviar el correo electrónico
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error('Error al enviar el correo electrónico:', error);
    } else {
      console.log('Correo electrónico enviado con éxito:', info.response);
    }
  });
}

module.exports = {enviarCorreo};