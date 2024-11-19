const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientes");
const conexion = require("../config/conexion");

const vespOriente = async () => {

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

  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  for (let i = 0; i < clientes.length; i++) {
    await page.goto("https://www.avo.cl/alternativo/login");
    await page.solveRecaptchas();
    await page.waitForTimeout(3000);

    let rut = clientes[i].rut;
    let dv = clientes[i].dv;
    let password = clientes[i].password;
    clientes[i].password = capitalizeFirstLetter(password);
    let cuenta = clientes[i].cuenta

    try {
      console.log('Usuario',rut,'-',dv);
      await page.solveRecaptchas()
      await page.waitForSelector('#loginPublico')
      await page.type("#email", rut + dv, { delay: 200 })
      await page.type("#password", clientes[i].password, { delay: 200 })
      await page.click(".btn.btn-primary.btn-block")
      await page.waitForNavigation();
      await page.goto('https://www.avo.cl/cliente/detalle_viajes')
      await page.waitForNavigation();
      await page.waitForTimeout(2000);
      console.log(cuenta);
      console.log('SESION INICIADA = ', rut);

  //-------esta todo bien hasta aqui-------\\
      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      await page.waitForTimeout(2000);
      const $ = cheerio.load(pageData.html);
      await page.waitForTimeout(2000);

      //Declaro Variables   
      let selec = $('#cuenta OPTION');
      let NoCliente = []; //array de convenio
      let patent = [];
      let data = [];
      //let pVehiculo = $("#select2-patente-container")
      //let pVehiculo = $("#patente.form-select OPTION")
      

      selec.each((i, el) => { //saca datos de convenio
        let value = $(el).val()
        NoCliente.push(value)
      });

      
      //console.log('total de convenios', NoCliente.length);
      let valor = NoCliente[1];
      await page.waitForSelector("#cuenta");
      await page.waitForTimeout(1000);
      await page.click("#filterForm");
      await page.click("#cuenta");
      await page.select("#cuenta", valor);
      await page.waitForTimeout(3000);

      let pVehiculo = $("#patente OPTION");
      await page.waitForTimeout(2000);

      pVehiculo.each((i, el) => { //saca la patente del vehiculo cliente o convenio
        let value = $(el).val();
        patent.push(value);
      });
      console.log('Patentes', patent);
      console.log('Total de Patentes',patent.length-1);

      //for Patente
      for (let a = 1; a < patent.length; a++) {
        await page.waitForSelector("#filterForm");
        await page.waitForSelector("div:nth-child(5) > button");
        await page.waitForTimeout(1000);

        const botones = await page.$$("div:nth-child(5) > button");
        await page.select("#patente.form-select", patent[a]);
        await page.waitForTimeout(1000);
        await botones[0].click();
        console.log("Patente = ", patent[a]);

        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });

        const $ = cheerio.load(pageData.html);

        const docs = $(".table").length;//id de la tabla

        await page.waitForTimeout(1000);

        if (docs == 0) { //define si es que hay una tabla con datos a extraer

          await page.waitForTimeout(1000);
        } else {
          page.waitForNavigation()

          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });
          const $ = cheerio.load(pageData.html);
          const paginas = $("ul.pagination").children(); //es para recorrer las paginas de las tablas "next"

          let pag = paginas.eq(paginas.length - 2).text();//la cantidad de paginas que tiene la tabla

          let pagi = "1"; //establece como predeterminado una pagina de tablas
          if (pag != "") {
            pagi = pag;//hace que cambie el predeterminado por la cantidad real(mayor a 1)
          }

          for (k = 0; k < pagi; k++) { //recorrer las paginas
            await page.waitForTimeout(1000)

            const pageData = await page.evaluate(() => {
              return {
                html: document.documentElement.innerHTML,
              };
            });

            const $ = cheerio.load(pageData.html);
            let autos = $(".table tbody tr");

            const noDeseado = 'La búsqueda realizada no arroja resultados. Si no encuentra los\n' +
              '                                        viajes que está buscando intente modificando los filtros.';

            let foundNoDeseado = false; // Bandera para indicar si se ha encontrado la etiqueta no deseada

            autos.each((i, el) => {
              //console.log('---linea 195entro al each'); //recorre los datos de la tabla y los extrae individualmente
              const getPatente = $("td:nth-child(1)", el).text();
              const getFecha = $("td:nth-child(2)", el).text();
              const getHora = $("td:nth-child(4)", el).text();
              const getPortico = $("td:nth-child(3)", el).text();
              const getMonto = $("td:nth-child(7)", el).text();
              const getConcesion = "Vespucio Oriente";

              if ($(el).text().includes(noDeseado)) {
                foundNoDeseado = true; // Establecer la bandera en true si se encuentra la etiqueta
                return false; // Detener el each()
              }
              data.push({ //guarda los datos de la tabla en las variables establecidas
                Patente: getPatente,
                Fecha: getFecha,
                Hora: getHora,
                Portico: getPortico,
                Monto: getMonto,
                Concesion: getConcesion,
              });
            });
            await page.waitForTimeout(1000)

            if (foundNoDeseado) {
              // Si se encontró la etiqueta no deseada, no se agregan los datos al array y se hace lo que necesites hacer en ese caso.
              //console.log("Se encontró la etiqueta no deseada. El procesamiento se detendrá.");
            } else {
              //console.log("Procesamiento exitoso. Se agregaron los datos al array 'data'.");
            }

            //console.log(data);

            let siguiente = await page.$('a[aria-label="Siguiente »"]');
            await page.waitForTimeout(3000)
            if ((siguiente = siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
              await page.waitForTimeout(2000);
              await page.click('a[aria-label="Siguiente »"]');

            } else {
              //console.log(`El cliente ${rut}, sin datos para capturar`);
              //continue;
            }

            await page.waitForTimeout(1000);

            conexion.connect((err) => {
              if (err) {
                console.log(
                  "A ocurrido un error en la conexion a la base de datos",
                  +err.stack
                );
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

                //console.log(number);

                conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                  if (err) throw err;
                });
              }
            });
          }
        }
      }//cierra la patente 

    } catch (error) {
      console.log('se ejecuta el catch');
      await page.waitForTimeout(2000);
      await page.waitForSelector(".logout-nav")
      await page.waitForTimeout(3000);
      await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
      await page.waitForTimeout(2000);

    }
    await page.waitForTimeout(2000);

    //await page.goto("https://www.avo.cl/alternativo/login");
    await page.waitForTimeout(2000);
    await page.waitForSelector(".logout-nav")
    await page.waitForTimeout(3000);
    await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
    await page.waitForTimeout(2000);

   /*  await page.waitForTimeout(2000);
    await page.waitForSelector(".logout-nav")
    await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
    await page.waitForTimeout(2000);
 */
  }
  console.log('PROCESO FINALIZADO !');
  await browser.close();

};

exports.vespOriente = vespOriente;