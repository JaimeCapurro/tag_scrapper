const nodemailer = require('nodemailer');
//se importan los archivos
const survia = require("./src/survia");
const rutaPass = require("./src/rutaPass");
const valleBioBio = require("./src/valleBioBio");
const vespNorte = require("./src/vespNorte");
const vespOriente = require("./src/vespOriente");

const rutaMaipo = require("./src/rutaMaipo");
const autoPase = require("./src/autoPase");
const autoVia = require("./src/autoVia");
const costaArauco = require("./src/costaArauco");

const costNorte = require("./src/costNorte");
const costNorte2 = require("./src/costNorte2")

const vespOriente2 = require("./src/vespOriente2")

const vespSur = require("./src/vespSur");
const vespSur2 = require("./src/vespSur2");

const prueba = require("./src/prueba")

async function concesionarios() {
  //await prueba.prueba();
  //await vespOriente.vespOriente(); //copia de vespOriente2
  //await vespOriente2.vespOriente2(); //no funciona, incompleta interación de patentes
  //await costNorte.costNorte();  //no se puede scrappear, hay captcha
  //await costNorte2.costNorte2(); //problema
  //await vespSur.vespSur(); //no se puede scrappear, hay captcha
  //await vespSur2.vespSur2(); //
  //await costaArauco.costaArauco(); // no se puede scrappear, se descarga la informacion en pdf

  try {
  //Habilitar descomentando las que se quieran ejecutar
  //await survia.survia();
  //await autoVia.autoVia(); //OK, revisar paginacion
  //await rutaMaipo.rutaMaipo(); //OK
  //await autoPase.autoPase();//OK
  //await rutaPass.rutaPass(); // OK? necesito ver datos
  //await valleBioBio.valleBioBio(); //OK
  //await vespNorte.vespNorte() //OK

  }

  catch (error) {
    console.error("Error en: " + error.stack.split("\n")[1].trim());
    console.error("Stack trace: " + error.stack);

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'tagsbot90@gmail.com',
        pass: 'yyxnynxolvfwwthj'
      }
    });
  
    let mailOptions = {
      from: 'tagsbot90@gmail.com',
      to: 'tagsbot90@gmail.com',
      subject: 'ERROR EN EL BOT DE LOS TAG',
      text: `Error en el bot de los TAG, revisar: ${error.stack}`,
      html: `<b>Error en el bot de los TAG, revisar: ${error.stack}</b>`
    };
  
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return console.log(err);
      }
      console.log('Correo enviado', info.messageId);
    });
  

  }

  
}

concesionarios();






