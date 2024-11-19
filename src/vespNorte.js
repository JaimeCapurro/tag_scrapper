const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientesVespNorte");
const conexion = require("../config/conexion");
//const { push } = require("./clientes");

const vespNorte = async () => {
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
  await page.goto("https://www.vespucionorte.cl/");
  await page.solveRecaptchas();
  await page.waitForTimeout(3000);

  //Carga clientes

  for (i = 0; i < clientes.length; i++) {
    let rut = /* "19105142"; */ clientes[i].rut;
    let dv = /* "4"; */ clientes[i].dv;
    let password = /* "rentacar1588"; */ clientes[i].password;
    let cuenta = clientes[i].cuenta;

    //Romper captcha

    try {
      
      await page.waitForTimeout(3000);
      await page.waitForSelector("#navbarHome");
      await page.waitForSelector("#login-btn");
      await page.click("#login-btn");
      await page.waitForTimeout(1000);
      await page.waitForSelector("#login-form");
      await page.waitForTimeout(1000);
      await page.type("#login-rut", rut + dv, { delay: 300 });
      await page.type("#login-pass", password, { delay: 300 });     
      await page.click("#login-submit");
      await page.waitForNavigation();
      console.log(cuenta);
      console.log('SESION INICIADA = ', rut);

      await page.waitForTimeout(2000);
      await page.goto(
        "https://www.vespucionorte.cl/VirtualOffice"

      );

      
      await page.waitForSelector('form[action="/VirtualOffice/BoletasConsumo"]');

      await page.evaluate(() => {
        // Find the form with the specific action attribute
        //page.waitForSelector('form[action="/VirtualOffice/BoletasConsumo"]');
        const form = document.querySelector('form[action="/VirtualOffice/BoletasConsumo"]');
        if (form) {
          //page.waitForNavigation();
          form.querySelector('button[type="submit"]').click(); // Click the submit button
        }
      });
      
      await page.waitForTimeout(1000);

      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      const $ = cheerio.load(pageData.html);

      //Declaro Variables
      await page.waitForTimeout(2000);
      let select = $("#selectClienteBol .optionCon");
      let NoCliente = [];
      let data = [];

      select.each((i, el) => {
        let value = $(el).text();
        NoCliente.push(value);
      });
      console.log(NoCliente, "     NoCliente   ");

      for (a = 0; a < NoCliente.length; a++) {
        await page.select("#selectClienteBol", NoCliente[a]);
        console.log("#selectClienteBol", NoCliente[a]);
        await page.waitForTimeout(2000);
        await page.click("#btnBuscarCliente");
        await page.waitForSelector("#no-facturado-list");
        await page.click("#no-facturado-list");
        await page.waitForTimeout(6000);

        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });

        //Salta numero de cliente
        await page.waitForTimeout(2000);
        const $ = cheerio.load(pageData.html);
        NoFact = $("#tablaNoFact").length;

        //console.log(NoFact);

        if (NoFact === 0) {
          console.log("No Facturado, no encontrado");

          await page.waitForTimeout(2000);
        } else {
          console.log(
            "----------------------------------------------------------------"
          );
          // capturar los datos de la tabla

          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });
          const $ = cheerio.load(pageData.html);
          const paginas = $("#tablaNoFact_paginate ul.pagination").children();
          const pag = paginas.eq(paginas.length - 2).text();

          console.log(pag, "   paginas  ");
          for (k = 0; k < pag; k++) {
            const pageData = await page.evaluate(() => {
              return {
                html: document.documentElement.innerHTML,
              };
            });

            const $ = cheerio.load(pageData.html);
            let autos = $("#tablaNoFact tbody tr");
            autos.each((i, el) => {
              const getPatente = $("td:nth-child(1)", el).text();
              const getFecha = $("td:nth-child(2)", el).text();
              const getHora = $("td:nth-child(3)", el).text();
              const getPortico = $("td:nth-child(5)", el).text();
              const getMonto = $("td:nth-child(9)", el).text();
              const getConcesion = "Vespucio Norte";
              data.push({
                Patente: getPatente,
                Fecha: getFecha,
                Hora: getHora,
                Portico: getPortico,
                Monto: getMonto,
                Concesion: getConcesion,
              });
            });

            console.log(data);

            let siguiente = await page.$("#tablaNoFact_next");
            if ((siguiente = siguiente)) {
              await page.waitForTimeout(2000);
              await page.click("#tablaNoFact_next");
            } else {
              //console.log(`El cliente ${rut}, sin datos para capturar`);
              await page.click(".ml-1");
              continue;
            }

            //console.log("-------", k, "--------");
          }

          //console.log(data.length);

          const mysql = require("mysql2");

          const connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "root",
            database: "testing",
          });

          connection.connect((err) => {
            if (err) {
              console.log("A ocurrido un error en la conexion a la base de datos", +err.stack);
            }
            console.log("Conectado a la base de datos =========>" + connection.threadId);

            const sql = "CALL pa_insertarDatosNest (?)";

            for (let i = 0; i < data.length; i++) {
              const number = new Array(
                data[i].Fecha,
                data[i].Hora,
                data[i].Patente,
                data[i].Portico,
                data[i].Monto,
                data[i].Concesion
              );

              //console.log(number);

              connection.query(sql, [number], (err, result) => {
                if (err) throw err;
                //console.log(result);
              });
            }
          });

          /* fs.writeFile(
            `./temp/${rut}vespucionorte${NoCliente[a]}.json`,
            JSON.stringify(data),
            (err) => {
              if (err) {
                console.log(
                  `Error en ejecucion de programa, cliente ${
                    rut + dv
                  }, error ${err}`
                );
                page.click(".ml-1");
              }
              console.log(
                `Información del cliente ${rut + dv}, extraida con exito!`
              );
            }
          ); */
          await page.waitForTimeout(2000);
        }
      }
      await page.click(".ml-1");
    } catch (error) {
      await page.click(".ml-1");
      console.log(
        `Error en la ejecucion del programa, cliente ${rut}, error ${error}`
      );

      await page.goto("https://www.vespucionorte.cl/");
      continue;
    }
  }
  await page.waitForTimeout(1000);
  await browser.close();
  console.log('PROCESO FINALIZADO');
};
// se exporta
exports.vespNorte = vespNorte;
