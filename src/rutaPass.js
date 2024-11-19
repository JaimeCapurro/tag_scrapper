const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");

const fs = require("fs");


const clientes = require("../client/clientes");
const conexion = require("../config/conexion");
const mail = require("../mail")
//const { push } = require("./clientes");

const rutaPass = async () => {

  //Datos del cliente
  puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: "2captcha",
        token: process.env.API_KEY,
      },
      visualFeedback: true,
    })
  );
  browser = await puppeteer.launch({
    headless: false,
  });
  page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 1080 });
  await page.goto("https://oficina-virtual.rutapass.cl/");
  await page.solveRecaptchas();
  await page.waitForTimeout(3000);

  //Carga clientes
  for (i = 0; i < clientes.length; i++) {
    let rut = clientes[i].rut;
    let dv = clientes[i].dv;
    let password = clientes[i].password;
    let cuenta = clientes[i].cuenta;

    console.log("--------------------------");
    console.log("USUARIO", rut + '-', dv);

    //Iniciar Sesion
    try {
      await page.waitForTimeout(3000);
      await page.type("#username", rut + dv, { delay: 300 });
      await page.type("#password", password, { delay: 300 });
      await page.click(".btn.btn-success");
      await page.waitForNavigation();
      await page.waitForTimeout(3000);
      console.log(cuenta);
      console.log('SESION INICIADA = ', rut + ' -', dv);

      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      const $ = cheerio.load(pageData.html);

      //Declaro Variables
      await page.waitForTimeout(2000);
      let selec = $("#pagar .form-select OPTION");
      let NoCliente = [];
      let data = [];
      let patent = [];

      selec.each((i, el) => {
        let value = $(el).val();
        NoCliente.push(value);
      });
      console.log('TOTAL DE CONVENIOS = ', NoCliente.length-1);

      //Recorriendo Convenios
      for (x = 1; x < NoCliente.length; x++) {
        patent.length = 0

        let valor = NoCliente[x]
        await page.waitForTimeout(1000);
        await page.click(".wrapper");
        await page.click(".form-select");
        await page.select("#pagar .form-select", valor);
        await page.waitForTimeout(1000);
        await page.waitForTimeout(3000);
        await page.goto("https://oficina-virtual.rutapass.cl/privada/detalle-de-transitos")
        await page.waitForTimeout(2000);

        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });
        const $ = cheerio.load(pageData.html);

        let pVehiculo = $("#patente_transito OPTION");
        pVehiculo.each((i, el) => { //saca la patente del vehiculo cliente o convenio
          let value = $(el).text();
          patent.push(value);
        });
        console.log('TOTAL DE PATENTES = ',patent.length-1);

        await page.waitForTimeout(2000)

        //Recorriendo patentes
        for (a = 1; a < patent.length; a++) {
          await page.waitForSelector("#ov_transitos");
          await page.waitForSelector('.btn.btn-primary');
          await page.waitForSelector('.form-select');

          await page.waitForTimeout(2000)
          const botones = await page.$$('.btn.btn-primary');
          await page.select("#patente_transito", patent[a]);
          await botones[0].click();
          console.log("PATENTE  = ", patent[a]);

          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });

          await page.waitForTimeout(2000);
          const $ = cheerio.load(pageData.html);
          const docs = $("#tbl_transitos").length;//id de la tabla

          if (docs == 0) { //define si es que hay una tabla con datos a extraer
            await page.waitForTimeout(2000);
          } else {

            // capturar los datos de la tabla
            const pageData = await page.evaluate(() => {
              return {
                html: document.documentElement.innerHTML,
              };
            });

            const $ = cheerio.load(pageData.html);
            const paginas = $(
              "#tbl_transitos_next"
            ); //es para recorrer las paginas de las tablas "next"
            const paginas2 = $(
              "#tbl_transitos_paginate span"
            ).children();
            let pag = paginas2.eq(paginas2.length - 1).text();//la cantidad de paginas que tiene la tabla

            let pagi = "1"; //establece como predeterminado una pagina de tablas
            if (pag != "") {
              pagi = pag;//hace que cambie el predeterminado por la cantidad real(mayor a 1)
            }

            for (k = 0; k < pagi; k++) { //recorrer las paginas
              const pageData = await page.evaluate(() => {
                return {
                  html: document.documentElement.innerHTML,
                };
              });

              const $ = cheerio.load(pageData.html);
              let autos = $("#tbl_transitos tbody tr");
              autos.each((i, el) => { //recorre los datos de la tabla y los extrae individualmente
                const getPatente = $("td:nth-child(1)", el).text();
                const getFecha = $("td:nth-child(2)", el).text();
                const getHora = $("td:nth-child(3)", el).text();
                const getPortico = $("td:nth-child(4)", el).text();
                const getMonto = $("td:nth-child(6)", el).text();
                const getConcesion = "Ruta Pass Nuevos";
                data.push({ //guarda los datos de la tabla en las variables establecidas
                  Patente: getPatente,
                  Fecha: getFecha,
                  Hora: getHora,
                  Portico: getPortico,
                  Monto: getMonto,
                  Concesion: getConcesion,
                });
              });


              let siguiente = await page.$("#tbl_transitos_next");
              if ((siguiente = siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
                await page.waitForTimeout(2000);
                await page.click("#tbl_transitos_next");
              } else {
                //console.log(`El cliente ${rut}, sin datos para capturar`);
                //continue;
              }
              //console.log("--linea 186-------", k, "--------");

              //Conexion a la BD
              conexion.connect((err) => {
                if (err) {
                  console.log("A ocurrido un error en la conexion a la base de datos", +err.stack);
                }

                const sql = "CALL pa_insertarDatosNest (?)";//se define el llamado al procedimiento almacenado en la variable 'sql'

                for (let i = 0; i < data.length; i++) { //se recorren los datos que extrajo el push
                  const number = new Array(
                    data[i].Fecha,
                    data[i].Hora,
                    data[i].Patente,
                    data[i].Portico,
                    data[i].Monto,
                    data[i].Concesion
                  );

                  console.log(data);
                  conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                    if (err) throw err;

                  });
                }// cierra los datos con push
              });
            }// cierra recorre paginas
          }//else
        }//cierra patente
      }//convenio cierra
    } catch (error) {
      console.log('Se ejecuta el Catch');
      await page.goto("https://oficina-virtual.rutapass.cl/");
      await page.waitForTimeout(2000);
      console.log(
        `Error en la ejecucion del programa, cliente ${rut}, error ${error}`
      );
      continue;
    }
    console.log("-- linea 226 Se Completa el ciclo")
    await page.goto("https://oficina-virtual.rutapass.cl");
    await page.waitForTimeout(2000);
  } //cierran los clientes
  await page.waitForTimeout(2000);
  await browser.close();

  conexion.end((err) => { //cierra la conexion a la base de datos
    if (err) {
      console.log(`Ocurrio un error al cerrar la conexión ${err}`);
    } else {
      console.log("Conexión cerrada =====>" + conexion.threadId);
    }
  });
  await browser.close();

};
//se exporta
exports.rutaPass = rutaPass;