const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientes");
const conexion = require("../config/conexion");

const portalRutaDelMaipo = async () => {
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
  await page.goto("https://taginterurbano.rutamaipo.cl/");
  //await page.solveRecaptchas();
  // Romper captcha

  for (i = 0; i < clientes.length; i++) {
    let rut = clientes[i].rut;
    let dv = clientes[i].dv;
    let password = clientes[i].password;
    cuenta = clientes[i].cuenta;
    try {
      await page.waitForTimeout(3000);
      await page.type("#rut_login", rut + dv, { delay: 500 });
      await page.type("#password", password, { delay: 500 });
      await page.click(".btn");
      console.log(cuenta);
      console.log('SESION INICIADA = ', rut + ' -', dv);

      await page.waitForTimeout(3000);
      await page.goto(
        "https://taginterurbano.rutamaipo.cl/oficina-virtual/detalle-transitos"
      );
      // capturar los datos de la tabla

      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      const $ = cheerio.load(pageData.html);
      const paginas = $("#documentos_emitidos_paginate ul.pagination")
        .children()
        .eq(7)
        .text();

      let data = []; // ====> Crea array con los datos de las tablas
      for (k = 0; k <= paginas; k++) {
        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });
        const $ = cheerio.load(pageData.html);
        let autos = $("#documentos_emitidos tbody tr");
        autos.each((i, el) => {
          const getFecha = $("td:nth-child(2)", el).text();
          const getHora = $("td:nth-child(3)", el).text();
          const getPatente = $("td:nth-child(1)", el).text();
          const getPortico = $("td:nth-child(4)", el).text();
          const getMonto = $("td:nth-child(8)", el).text();
          const getConcesion = "Ruta Maipo";
          data.push({
            fecha: getFecha,
            hora: getHora,
            patente: getPatente,
            portico: getPortico,
            monto: getMonto,
            Concesion: getConcesion,
          });
        });

        let siguente = await page.$(".next");
        if (siguente) {
          await page.waitForTimeout(2000);
          await page.click(".next");
        } else {
          console.log(`El cliente ${rut}, sin datos para capturar`);

          await page.click(".ri-logout-circle-r-line");
          continue;
        }
      }
      /*
       * Guarda los datos capturados en la base de datos
       */
      const sql = "CALL pa_insertarDatosNest (?)";
      for (j = 0; j < data.length; j++) {
        let number = new Array(
          data[j].fecha,
          data[j].hora,
          data[j].patente,
          data[j].portico,
          data[j].monto,
          data[i].Concesion
        );
        conexion.query(sql, [number], (err) => {
          if (err) {
            console.log(
              `A ocurrido un error en la extración de informacion del cliente ${rut}, el error es ${err}`
            );
          }
          console.log(`Información del cliente ${rut}, extraida con exito!`);
        });
      }

      await page.waitForTimeout(6000);
      await page.click(".ri-logout-circle-r-line");
    } catch (error) {
      console.log(
        `Ocurrio un error el la ejecuccion del programa, informacion del cliente ${rut}, presento el error ${error}`
      );
    }
  }
  //se cierra el navegador y se cierra conexion con bd
  await page.waitForTimeout(1000);
  await browser.close();

  conexion.end((err) => {
    if (err) {
      console.log(`Ocurrio un error al cerrar la conexión ${err}`);
    } else {
      console.log("Conexión cerrada =====>" + conexion.threadId);
    }
  });
  console.log('PROCESO FINALIZADO');
  await browser.close();

};

exports.rutaMaipo = portalRutaDelMaipo;
