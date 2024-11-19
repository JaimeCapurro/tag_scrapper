const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientes");
const conexion = require("../config/conexion");
//const { ProtocolError } = require("puppeteer");

const portalAutoPase = async () => {
  try {
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
    await page.goto("https://www.autopase.cl/portada/logout/");
    await page.solveRecaptchas();
    const pageData = await page.evaluate(() => {
      return {
        html: document.documentElement.innerHTML,
      };
    });
    const $ = cheerio.load(pageData.html);

    await page.waitForSelector(".close")
    await page.mouse.click(220, 220);

    console.log('se cierra ? ');


    for (a = 0; a < clientes.length; a++) {
      let rut = clientes[a].rut;
      let dv = clientes[a].dv;
      let password = clientes[a].password;
      let cuenta = clientes[a].cuenta;

      try {
        await page.waitForTimeout(5000)
        //await page.click("#Enviar");
        const autopaseFacturado = []; //===> 💾 Guarda los datos historicos de Autopase <====//
        await page.waitForTimeout(1000);
        await page.type("#sRUT", rut + dv, { delay: 300 });
        await page.type("#sClave", password, { delay: 300 });
        await page.click("#Enviar");
        await page.waitForNavigation()
        console.log(cuenta);
        console.log('SESION INICIADA = ', rut + ' -', dv);
        //AutopistaCentral
        await page.waitForTimeout(1000);
        await page.goto(
          "https://www.autopase.cl/cliente/tufacturacion/cartola"
        );
        await page.waitForTimeout(1000);
        await page.click(".facturacionBox .contentToggler");

        await page.waitForTimeout(3000);
        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });
        const $ = cheerio.load(pageData.html);
        const url = [];
        let tabla = $(".table-light tbody tr td a");

        tabla.each((i, el) => {
          let link = $(el).attr("href");
          url.push(link);
        });
        let getUrl = url[1];

        //Tabla detalle facturado
        await page.goto(`https://www.autopase.cl${getUrl}`);
        await page.waitForTimeout(500);
        const pagines = 2;
        for (i = 0; i <= pagines; i++) {
          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });
          const $ = cheerio.load(pageData.html);
          let detalle = $(".page tr");
          detalle.each((i, el) => {
            const getPatente = $("td:nth-child(1)", el).text();
            const getPortico = $("td:nth-child(2)", el).text();
            const getFecha = $("td:nth-child(5)", el).text();
            const getHora = $("td:nth-child(6)", el).text();
            const getMonto = $("td:nth-child(8)", el).text();
            const getConcesion = "Autopase facturado"
            autopaseFacturado.push({
              patente: getPatente,
              fecha: getFecha,
              hora: getHora,
              portico: getPortico,
              monto: getMonto,
              concesion: getConcesion
            });
          });
          console.log("first");
          console.log(autopaseFacturado.length);
          console.log(autopaseFacturado);


          //Guarda los datos en la base de datos
          await page.waitForTimeout(2000)


          conexion.connect((err) => {
            console.log('entro a la conexion');
            if (err) {
              console.log(
                "A ocurrido un error en la conexion a la base de datos",
                +err.stack
              );
            }
            console.log('linea 113');

            const sql = "CALL pa_insertarDatosNest (?)";
            for (let j = 0; j < autopaseFacturado.length; j++) {
              let number = new Array(
                autopaseFacturado[j].fecha,
                autopaseFacturado[j].hora,
                autopaseFacturado[j].patente,
                autopaseFacturado[j].portico,
                autopaseFacturado[j].monto,
                autopaseFacturado[j].concesion
              );
              console.log('sali del for');


              conexion.query(sql, [number], (err, result) => {
                if (err) {
                  console.log(
                    `A ocurrido un error en la extración de informacion del cliente ${rut}, el error es ${err}`
                  );
                }
                console.log(
                  `Información del cliente ${rut}, extraida con exito!`
                );
              });
            }
          })

          /* fs.writeFile(
            `./temp/${rut}-autopistaCentralFacturado.json`,
            JSON.stringify(autopaseFacturado),
            (err) => {
              if (err) {
                console.log("A ocurrido un error al crear el archivo", err);
              }
              console.log(
                `Información del cliente ${rut}, extraida con exito!`
              );
            }
          ); */
        }
        //💪 Ahora Comienza la extracción de datos de Consumos no Facturados... 💪
        await page.waitForTimeout(500);
        const autopaseNoFacturado = [];
        const noFacturado =
          "https://www.autopase.cl/cliente/consumos/consumo_peaje_nofacturado";

        if (noFacturado) {
          await page.goto(noFacturado);
          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });
          const $ = cheerio.load(pageData.html);

          patente = [];
          const select = $("#patente option");
          select.each((i, el) => {
            let value = $(el).text();
            patente.push(value);
          });

          for (h = 1; h < patente.length; h++) {
            await page.type("#patente", patente[h]);
            await page.waitForTimeout(1000);
            await page.click("#buscar");
            await page.waitForTimeout(6000);
            const pageData = await page.evaluate(() => {
              return {
                html: document.documentElement.innerHTML,
              };
            });
            const $ = cheerio.load(pageData.html);
            let detalle = $(".page tr");
            detalle.each((i, el) => {
              const getPatente = $("td:nth-child(1)", el).text();
              const getPortico = $("td:nth-child(2)", el).text();
              const getFecha = $("td:nth-child(5)", el).text();
              const getHora = $("td:nth-child(6)", el).text();
              const getMonto = $("td:nth-child(7)", el).text();
              const getConcesion = "Autopase No Facturado"
              autopaseNoFacturado.push({
                patente: getPatente,
                fecha: getFecha,
                hora: getHora,
                portico: getPortico,
                monto: getMonto,
                consecion: getConcesion
              });
            });
            //guarda datos en base de datos
            console.log('linea 205');

            const sql = "CALL pa_insertarDatosNest (?)";
            for (j = 0; j < autopaseNoFacturado.length; j++) {
              let number = new Array(
                autopaseNoFacturado[j].fecha,
                autopaseNoFacturado[j].hora,
                autopaseNoFacturado[j].patente,
                autopaseNoFacturado[j].portico,
                autopaseNoFacturado[j].monto,
                autopaseNoFacturado[j].consecion

              );
              conexion.query(sql, [number], (err) => {
                if (err) {
                  console.log(
                    `A ocurrido un error en la extración de informacion del cliente ${rut}, el error es ${err}`
                  );
                }
                console.log(
                  `Información del cliente ${rut}, extraida con exito!`
                );
              });
            }
            console.log('linea 227');

            /* fs.writeFile(
              `../temp/${rut}-autopistaCentralNoFacturado.json`,
              JSON.stringify(autopaseNoFacturado),
              (err) => {
                if (err) {
                  console.log("A ocurrido un error al crear el archivo", err);
                }
                console.log(
                  `Información del cliente ${rut}, extraida con exito!`
                );
              }
            ) */;
          }
        }
        //💪 Ahora Comienza la extracción de datos de Autopistas interubanas 💪
        await page.waitForTimeout(500);
        const interubanasNoFacturadas = [];
        const interUrbanas =
          "https://www.autopase.cl/cliente/consumos/consumo_peaje_nofacturado_interurbana";
        if (interUrbanas) {
          await page.goto(interUrbanas);
          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });
          const $ = cheerio.load(pageData.html);
          const ubicacion = [];
          const select = $("#ubicacion option");
          select.each((i, el) => {
            let value = $(el).text();
            ubicacion.push(value);
          });


          for (a = 1; a < ubicacion.length; a++) {
            await page.type("#ubicacion", ubicacion[a]);
            await page.waitForTimeout(500);

            for (m = 1; m < patente.length; m++) {
              await page.type("#patente", patente[m]);
              await page.click("#buscar");
              await page.waitForTimeout(4000);

              const pageData = await page.evaluate(() => {
                return {
                  html: document.documentElement.innerHTML,
                };
              });
              const $ = cheerio.load(pageData.html);
              const urbanas = $("#facturas tbody tr");
              urbanas.each((i, el) => {
                const getPatente = $("td:nth-child(1)", el).text();
                const getPortico = $("td:nth-child(2)", el).text();
                const getFecha = $("td:nth-child(5)", el).text();
                const getHora = $("td:nth-child(6)", el).text();
                const getMonto = $("td:nth-child(7)", el).text();
                const getConcesion = "Autopase Inter urbana no facturada"

                interubanasNoFacturadas.push({
                  patente: getPatente,
                  fecha: getFecha,
                  hora: getHora,
                  portico: getPortico,
                  monto: getMonto,
                  concesion: getConcesion
                });
              });
            }
            console.log('linea 293');

            const sql = "CALL pa_insertarDatosNest (?)";

            for (let i = 0; i < interubanasNoFacturadas.length; i++) {
              const number = new Array(
                interubanasNoFacturadas[i].fecha,
                interubanasNoFacturadas[i].hora,
                interubanasNoFacturadas[i].patente,
                interubanasNoFacturadas[i].portico,
                interubanasNoFacturadas[i].monto,
                interubanasNoFacturadas[i].concesion

              );

              //console.log(number);
              console.log('linea 312');

              conexion.query(sql, [number], (err, result) => {
                if (err) throw err;
                //console.log(result);
              });
            }

            /* fs.writeFile(
              `./temp/${rut}-interUbanasNoFacturado.json`,
              JSON.stringify(interubanasNoFacturadas),
              (err) => {
                if (err) {
                  console.log("A ocurrido un error al crear el archivo", err);
                }
                console.log(
                  `Información del cliente ${rut}, extraida con exito!`
                );
              }
            ); */
          }
        }
        await page.waitForTimeout(1000);
        await page.click(".cerrar_sesion");
      } catch (error) {
        `Ocurrio un error en la ejecucion del programa, informacion del cliente ${rut}, presento el error ${error}`;
      }
    }
  } catch (error) {
    console.log(
      "A ocurrido un error en la ejecucion de la Funcion portalAutopase",
      error
    );
    await browser.close();
  }
  await browser.close();
};

exports.autoPase = portalAutoPase;



