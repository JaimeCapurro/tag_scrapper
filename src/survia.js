const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientesSurvia");
const conexion = require("../config/conexion");
//const { push } = require("./clientes");

const survia = async () => {
  //Datos del cliente

  puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: "2captcha",
        token: process.env.API_KEY,
      },
      visualFeedback: false,
    })
  );
  browser = await puppeteer.launch({
    headless: false,
    //args: ['--start-fullscreen'] 
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1080 });
  await page.goto("https://oficina-virtual.survias.cl/");
  await page.solveRecaptchas();
  await page.waitForTimeout(3000);

  //Carga clientes
  for (i = 0; i < clientes.length; i++) {
   
    let rut = clientes[i].rut;
    let dv = clientes[i].dv;
    let password = clientes[i].password;
    let cuenta = clientes[i].cuenta;

    console.log('USUARIO', rut + ' -', dv);

    try { //iniciar sesion
      await page.waitForTimeout(2000);
      await page.type("#rut_login", rut + dv, { delay: 300 });
      await page.type("#password", password, { delay: 300 });
      page.waitForNavigation();
      await page.click(".btn.btn-primary");
      //await page.waitForNavigation()
      await page.waitForTimeout(2000);

      console.log(cuenta);
      console.log('SESION INICIADA = ', rut + ' -', dv);
      await page.goto("https://oficina-virtual.survias.cl/oficina-virtual/detalle-transitos");


      await page.waitForTimeout(3000);
      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      await page.waitForTimeout(2000);
      const $ = cheerio.load(pageData.html);

      //Declaro Variables
      await page.waitForTimeout(2000);
      let selec = $("#cambio_convenio OPTION");
      let NoCliente = [];
      let data = [];
      let patent = [];

      selec.each((i, el) => { //saca el num de cliente o num de convenio
        let value = $(el).val()
        NoCliente.push(value);
      });
      console.log("TOTAL DE CONVENIOS = ", NoCliente.length);



      for (a = 0; a < NoCliente.length; a++) { //recorrer los clientes o los convenios

        await page.goto("https://oficina-virtual.survias.cl/oficina-virtual/detalle-transitos");
        patent.length = 0
        let valor = NoCliente[a]
        //await page.select("#cambio_convenio", NoCliente[a]);
        await page.waitForSelector("#cambio_convenio")
        await page.click("#cambio_convenio")
        await page.select("#cambio_convenio", valor)
        await page.waitForTimeout(2000);
        await page.goto("https://oficina-virtual.survias.cl/oficina-virtual/detalle-transitos");

        await page.waitForTimeout(2000);


        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });
        const $ = cheerio.load(pageData.html);

        let pVehiculo = $("#patente_vehiculo OPTION");
        pVehiculo.each((i, el) => { //saca la patente del vehiculo cliente o convenio
          let value = $(el).text();
          patent.push(value);
        });
        console.log("TOTAL DE PATENTES = ", patent.length - 1);

        for (b = 1; b < patent.length; b++) { //recorre las patentes

          console.log('PATENTE = ', patent[b]);
          await page.waitForSelector("#cambio_convenio")
          await page.waitForSelector("#buscar_transitos");
          await page.waitForSelector(".btn.btn-primary");

          const botones = await page.$$(".btn.btn-primary");

          await page.select("#patente_vehiculo", patent[b]);
          await botones[0].click();

          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });

          await page.waitForTimeout(2000);
          const $ = cheerio.load(pageData.html);
          const docs = $("#documentos_emitidos").length;//id de la tabla
          //console.log(docs);

          if (docs == 0) { //define si es que hay una tabla con datos a extraer
            //console.log("documentos no encontrado");

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
              "#documentos_emitidos_paginate ul.pagination"
            ).children(); //es para recorrer las paginas de las tablas "next"
            let pag = paginas.eq(paginas.length - 2).text();//la cantidad de paginas que tiene la tabla

            let pagi = "1"; //establece como predeterminado una pagina de tablas
            if (pag != "") {
              pagi = pag;//hace que cambie el predeterminado por la cantidad real(mayor a 1)
            }
            //console.log(pagi, "new pag");

            for (k = 0; k < pagi; k++) { //recorrer las paginas
              const pageData = await page.evaluate(() => {
                return {
                  html: document.documentElement.innerHTML,
                };
              });

              const $ = cheerio.load(pageData.html);
              let autos = $("#documentos_emitidos tbody tr");
              autos.each((i, el) => { //recorre los datos de la tabla y los extrae individualmente
                const getPatente = $("td:nth-child(1)", el).text();
                const getFecha = $("td:nth-child(2)", el).text();
                const getHora = $("td:nth-child(3)", el).text();
                const getPortico = $("td:nth-child(4)", el).text();
                const getMonto = $("td:nth-child(6)", el).text();
                const getConcesion = "Survia";
                data.push({ //guarda los datos de la tabla en las variables establecidas
                  Patente: getPatente,
                  Fecha: getFecha,
                  Hora: getHora,
                  Portico: getPortico,
                  Monto: getMonto,
                  Concesion: getConcesion,
                });
              });

              //console.log(data);

              let siguiente = await page.$("#documentos_emitidos_next");
              if ((siguiente = siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
                await page.waitForTimeout(2000);
                await page.click("#documentos_emitidos_next");
              } else {
                //console.log(`El cliente ${rut}, sin datos para capturar`);
                //await page.goto("https://oficina-virtual.survias.cl/logout");
                continue;
              }

              //console.log("-------", k, "--------");

              //Conexion a la BD
              conexion.connect((err) => {
                if (err) {
                  console.log("A ocurrido un error en la conexion a la base de datos", +err.stack);
                }
                //console.log("Conectado a la base de datos =========>" + conexion.threadId);

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

                  //console.log(data);
                  //console.log(number);

                  conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                    if (err) throw err;
                    //console.log(result);
                  });
                }
              });
            }
          }
        }
      }


    } catch (error) {
      await page.goto("https://oficina-virtual.survias.cl/logout");
      await page.waitForTimeout(2500);
      //console.log(`Error en la ejecucion del programa, cliente ${rut}, error ${error}`)
      continue;
    }
    await page.goto("https://oficina-virtual.survias.cl/logout");
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(1000);
  await browser.close();

  conexion.end((err) => { //cierra la conexion a la base de datos
    if (err) {
      console.log(`Ocurrio un error al cerrar la conexión ${err}`);
    } else {
      console.log("Conexión cerrada =====>" + conexion.threadId);
    }
  });
};
//se exporta
exports.survia = survia;
