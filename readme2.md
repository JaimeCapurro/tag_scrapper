//este archivo esta cambiando de patentes yde convenio, ahora solo falta que guarde y que no se caiga despues del primer guardado

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

    //console.log('Usuario = ', rut + dv)

    try {
      console.log(rut);
      await page.solveRecaptchas()
      await page.waitForSelector('#loginPublico')
      //console.log('Ingresando Datos');
      await page.type("#email", rut + dv, { delay: 200 })
      await page.type("#password", clientes[i].password, { delay: 200 })
      await page.click(".btn.btn-primary")
      await page.waitForNavigation();
      await page.goto('https://www.avo.cl/cliente/detalle_viajes')
      //await page.waitForNavigation();
      await page.waitForTimeout(2000);

      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      await page.waitForTimeout(2000);
      const $ = cheerio.load(pageData.html);

      //Declaro Variables
      await page.waitForTimeout(2000);
      let pVehiculo = $("#patente.form-select OPTION")
      let selec = $('#cuenta.form-select OPTION')
      let NoCliente = [] //array de convenio
      //let pVehiculo = $("#select2-patente-container")
      let patent = [];
      let data = [];


      selec.each((i, el) => { //saca datos de convenio
        let value = $(el).val()
        NoCliente.push(value)
      })

      const totalConvenio = NoCliente.length - 1

      if (totalConvenio === -1) {
        console.log('Total de Convenio = ', 0);
      } else {
        // Otras acciones a realizar si totalPatentes no es igual a -1
        console.log('Total de Convenio = ', totalConvenio);
      }

      pVehiculo.each((i, el) => { //saca la patente del vehiculo cliente o convenio
        let value = $(el).val();
        patent.push(value);
      });

      const totalPatentes = patent.length - 1;
      console.log("Total de Patentes =", totalPatentes);

      //const options = await page.$$('#cuenta option');

      //for Convenio
      for (let w = 1; w < NoCliente.length; w++) {
        console.log('se ejecuta for de convenio');

        let valor = NoCliente[w]
        await page.waitForTimeout(2000)
        await page.click("#filterForm")
        await page.click("#cuenta.form-select")
        await page.select("#cuenta.form-select", valor)
        await page.waitForTimeout(2000)

        //for Patente
        for (let a = 1; a < patent.length; a++) {
          console.log('entro al for de patentes');
          await page.waitForSelector("#filterForm");
          await page.waitForSelector("div:nth-child(5) > button");
          await page.waitForTimeout(2000)


          await page.click("#filterForm > div > div:nth-child(4) > span > span.selection > span > span.select2-selection__arrow")
          const botones = await page.$$("div:nth-child(5) > button");
          await page.select("#patente.form-select", patent[a]);
          await botones[0].click();
          console.log("Patente = ", patent[a]);

          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });

          const $ = cheerio.load(pageData.html);

          const docs = $(".table").length;//id de la tabla

          console.log(docs);

          await page.waitForTimeout(2000);

          if (docs == 0) { //define si es que hay una tabla con datos a extraer
            console.log("documentos no encontrado");

            await page.waitForTimeout(2000);
          } else {
            console.log("--------------------------------");
            page.waitForNavigation()


            // capturar los datos de la tabla

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
            console.log(pagi, "new pag");

            for (k = 0; k < pagi; k++) { //recorrer las paginas
              const pageData = await page.evaluate(() => {
                return {
                  html: document.documentElement.innerHTML,
                };
              });

              const $ = cheerio.load(pageData.html);
              let autos = $(".table tbody tr");
              autos.each((i, el) => { //recorre los datos de la tabla y los extrae individualmente
                const getPatente = $("td:nth-child(1)", el).text();
                const getFecha = $("td:nth-child(2)", el).text();
                const getHora = $("td:nth-child(4)", el).text();
                const getPortico = $("td:nth-child(3)", el).text();
                const getMonto = $("td:nth-child(7)", el).text();
                const getConcesion = "Vespucio Oriente";
                data.push({ //guarda los datos de la tabla en las variables establecidas
                  Patente: getPatente,
                  Fecha: getFecha,
                  Hora: getHora,
                  Portico: getPortico,
                  Monto: getMonto,
                  Concesion: getConcesion,
                });
              });

              console.log(data);

              let siguiente = await page.$("li:nth-child(8) > a");
              if ((siguiente = siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
                await page.waitForTimeout(2000);
                await page.click("li:nth-child(8) > a");
              } else {
                console.log(`El cliente ${rut}, sin datos para capturar`);
                continue;
              }

              console.log("-------", k, "--------");

              conexion.connect((err) => {
                if (err) {
                  console.log(
                    "A ocurrido un error en la conexion a la base de datos",
                    +err.stack
                  );
                }
                console.log(
                  "Conectado a la base de datos =========>" + conexion.threadId
                );

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

                  console.log(number);

                  conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                    if (err) throw err;
                    console.log(result);
                  });
                }
              });

            }

          }

        }//cierra la patente 
      } //cierra el convenio

    } catch (error) {
      console.log('se ejecuta el catch');
      await page.waitForTimeout(3000);
      await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');

    }
    await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
    await page.waitForTimeout(2500);

  }
};

exports.vespOriente = vespOriente;















//esta guardando datos  pero no cambia ni de convenio ni de patente

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

    //console.log('Usuario = ', rut + dv)

    try {
      console.log(rut);
      await page.solveRecaptchas()
      await page.waitForSelector('#loginPublico')
      //console.log('Ingresando Datos');
      await page.type("#email", rut + dv, { delay: 200 })
      await page.type("#password", clientes[i].password, { delay: 200 })
      await page.click(".btn.btn-primary")
      await page.waitForNavigation();
      await page.goto('https://www.avo.cl/cliente/detalle_viajes')
      //await page.waitForNavigation();
      await page.waitForTimeout(2000);

      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      await page.waitForTimeout(2000);
      const $ = cheerio.load(pageData.html);

      //Declaro Variables
      await page.waitForTimeout(2000);
      let pVehiculo = $("#patente OPTION")
      //let pVehiculo = $("#select2-patente-container")
      let patent = [];
      let data = [];

      pVehiculo.each((i, el) => { //saca la patente del vehiculo cliente o convenio
        let value = $(el).text();
        patent.push(value);
      });

      const totalPatentes = patent.length - 1;
      console.log("Total de Patentes =", totalPatentes);

      for (let a = 1; a < patent.length; a++) {
        await page.waitForSelector("#filterForm");
        await page.waitForSelector("#filterForm > div > div:nth-child(5) > button");

        const botones = await page.$$("#filterForm > div > div:nth-child(5) > button");

        await page.select("#patente", patent[a]);
        await botones[0].click();
        console.log("Patente = ", patent[a]);

        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });

        const $ = cheerio.load(pageData.html);

        const docs = $(".table").length;//id de la tabla

        console.log(docs);

        await page.waitForTimeout(2000);

        if (docs == 0) { //define si es que hay una tabla con datos a extraer
          console.log("documentos no encontrado");

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
          const paginas = $("ul.pagination").children(); //es para recorrer las paginas de las tablas "next"

          let pag = paginas.eq(paginas.length - 2).text();//la cantidad de paginas que tiene la tabla

          let pagi = "1"; //establece como predeterminado una pagina de tablas
          if (pag != "") {
            pagi = pag;//hace que cambie el predeterminado por la cantidad real(mayor a 1)
          }
          console.log(pagi, "new pag");

          for (k = 0; k < pagi; k++) { //recorrer las paginas
            const pageData = await page.evaluate(() => {
              return {
                html: document.documentElement.innerHTML,
              };
            });

            const $ = cheerio.load(pageData.html);
            let autos = $(".table tbody tr");
            autos.each((i, el) => { //recorre los datos de la tabla y los extrae individualmente
              const getPatente = $("td:nth-child(1)", el).text();
              const getFecha = $("td:nth-child(2)", el).text();
              const getHora = $("td:nth-child(4)", el).text();
              const getPortico = $("td:nth-child(3)", el).text();
              const getMonto = $("td:nth-child(7)", el).text();
              const getConcesion = "Vespucio Oriente";
              data.push({ //guarda los datos de la tabla en las variables establecidas
                Patente: getPatente,
                Fecha: getFecha,
                Hora: getHora,
                Portico: getPortico,
                Monto: getMonto,
                Concesion: getConcesion,
              });
            });

            console.log(data);

            let siguiente = await page.$("body > section > div > div.row.align-items-center > div:nth-child(2) > nav > ul > li:nth-child(6) > a");
            if ((siguiente = siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
              await page.waitForTimeout(2000);
              await page.click("body > section > div > div.row.align-items-center > div:nth-child(2) > nav > ul > li:nth-child(6) > a");
            } else {
              console.log(`El cliente ${rut}, sin datos para capturar`);
              //await page.goto("https://oficina-virtual.survias.cl/logout");
              //continue;
            }

            console.log("-------", k, "--------");


            conexion.connect((err) => {
              console.log('---linea 173 entra a la conexion');
              if (err) {
                console.log(
                  "A ocurrido un error en la conexion a la base de datos",
                  +err.stack
                );
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

                conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                  if (err) throw err;
                  console.log(result);
                });
              }// cierra los datos con push
            });

          }

        }

      }

    } catch (error) {
      console.log('se ejecuta el catch');
      await page.waitForTimeout(3000);
      await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');

    }
    await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
    await page.waitForTimeout(2500);

  }
};

exports.vespOriente = vespOriente;












//tengo error, siempre me captura el dato de la primera patente
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

    //console.log('Usuario = ', rut + dv)

    try {
      console.log(rut);
      await page.solveRecaptchas()
      await page.waitForSelector('#loginPublico')
      //console.log('Ingresando Datos');
      await page.type("#email", rut + dv, { delay: 200 })
      await page.type("#password", clientes[i].password, { delay: 200 })
      await page.click(".btn.btn-primary")
      await page.waitForNavigation();
      await page.goto('https://www.avo.cl/cliente/detalle_viajes')
      //await page.waitForNavigation();
      await page.waitForTimeout(2000);

      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      await page.waitForTimeout(2000);
      const $ = cheerio.load(pageData.html);

      //Declaro Variables
      await page.waitForTimeout(2000);
      let pVehiculo = $("#patente.form-select OPTION")
      let selec = $('#cuenta.form-select OPTION')
      //let pVehiculo = $("#select2-patente-container")
      let patent = [];
      let data = [];
      let NoCliente = [];

      selec.each((i, el) => { //saca datos de convenio
        let value = $(el).val()
        NoCliente.push(value)
      })

      const totalConvenio = NoCliente.length - 1

      if (totalConvenio === -1) {
        console.log('Total de Convenio = ', 0);
      } else {
        // Otras acciones a realizar si totalPatentes no es igual a -1
        console.log('Total de Convenio = ', totalConvenio);
      }

      pVehiculo.each((i, el) => { //saca la patente del vehiculo cliente o convenio
        let value = $(el).val();
        patent.push(value);
      });
      for (let w = 1; w < NoCliente.length; w++) {
        console.log('se ejecuta for de convenio');

        let valor = NoCliente[w]
        await page.waitForTimeout(2000)
        await page.click("#filterForm")
        await page.click("#cuenta.form-select")
        await page.select("#cuenta.form-select", valor)
        await page.waitForTimeout(2000)

     /*  const totalPatentes = patent.length - 1;
      console.log("Total de Patentes =", totalPatentes); */

      for (let a = 1; a < patent.length; a++) {
        console.log('entro al for de patentes');
        await page.waitForSelector("#filterForm");
        await page.waitForSelector("div:nth-child(5) > button");
        await page.waitForTimeout(2000)


        await page.click("#filterForm > div > div:nth-child(4) > span > span.selection > span > span.select2-selection__arrow")
        const botones = await page.$$("div:nth-child(5) > button");
        await page.select("#patente.form-select", patent[a]);
        await botones[0].click();
        console.log("Patente = ", patent[a]);

        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });

        const $ = cheerio.load(pageData.html);

        const docs = $(".table").length;//id de la tabla

        console.log(docs);

        await page.waitForTimeout(2000);

        if (docs == 0) { //define si es que hay una tabla con datos a extraer
          console.log("documentos no encontrado");

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
          const paginas = $("ul.pagination").children(); //es para recorrer las paginas de las tablas "next"

          let pag = paginas.eq(paginas.length - 2).text();//la cantidad de paginas que tiene la tabla

          let pagi = "1"; //establece como predeterminado una pagina de tablas
          if (pag != "") {
            pagi = pag;//hace que cambie el predeterminado por la cantidad real(mayor a 1)
          }
          console.log(pagi, "new pag");

          for (k = 0; k < pagi; k++) { //recorrer las paginas
            const pageData = await page.evaluate(() => {
              return {
                html: document.documentElement.innerHTML,
              };
            });

            const $ = cheerio.load(pageData.html);
            let autos = $(".table tbody tr");
            autos.each((i, el) => { //recorre los datos de la tabla y los extrae individualmente
              const getPatente = $("td:nth-child(1)", el).text();
              const getFecha = $("td:nth-child(2)", el).text();
              const getHora = $("td:nth-child(4)", el).text();
              const getPortico = $("td:nth-child(3)", el).text();
              const getMonto = $("td:nth-child(7)", el).text();
              const getConcesion = "Vespucio Oriente";
              data.push({ //guarda los datos de la tabla en las variables establecidas
                Patente: getPatente,
                Fecha: getFecha,
                Hora: getHora,
                Portico: getPortico,
                Monto: getMonto,
                Concesion: getConcesion,
              });
            });

            console.log(data);

           /*  let siguiente = await page.$("li:nth-child(8) > a");
            if ((siguiente = siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
              await page.waitForTimeout(2000);
              await page.click("li:nth-child(8) > a");
            } else {
              console.log(`El cliente ${rut}, sin datos para capturar`);
              //await page.goto("https://oficina-virtual.survias.cl/logout");
              continue;
            } */

            console.log("-------", k, "--------");


            conexion.connect((err) => {
              console.log('---linea 173 entra a la conexion');
              if (err) {
                console.log(
                  "A ocurrido un error en la conexion a la base de datos",
                  +err.stack
                );
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

                conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                  if (err) throw err;
                  console.log(result);
                });
              }// cierra los datos con push
            });

          }

        }

      }
    }

    } catch (error) {
      console.log('se ejecuta el catch');
      await page.waitForTimeout(3000);
      await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');

    }
    await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
    await page.waitForTimeout(2500);

  }
};

exports.vespOriente = vespOriente;



//lo mas cerca al exito jaja me dice un error que el mensaje de alerta ya ha sido cerrado necesito solucionar eso y necesito que cambie de paginas y estaria listo 

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

    //console.log('Usuario = ', rut + dv)

    try {
      console.log(rut);
      await page.solveRecaptchas()
      await page.waitForSelector('#loginPublico')
      //console.log('Ingresando Datos');
      await page.type("#email", rut + dv, { delay: 200 })
      await page.type("#password", clientes[i].password, { delay: 200 })
      await page.click(".btn.btn-primary")
      await page.waitForNavigation();
      await page.goto('https://www.avo.cl/cliente/detalle_viajes')
      //await page.waitForNavigation();
      await page.waitForTimeout(2000);

      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      await page.waitForTimeout(2000);
      const $ = cheerio.load(pageData.html);

      //Declaro Variables
      await page.waitForTimeout(2000);
      let pVehiculo = $("#patente.form-select OPTION")
      let selec = $('#cuenta.form-select OPTION')
      let NoCliente = [] //array de convenio
      let NoCliente2 = []
      //let pVehiculo = $("#select2-patente-container")
      let patent = [];
      let data = [];

      selec.each((i, el) => { //saca datos de convenio numero 2
        let value = $(el).text()
        NoCliente2.push(value)
      })
      console.log('---linea 81', NoCliente2.length);


      selec.each((i, el) => { //saca datos de convenio
        let value = $(el).val()
        NoCliente.push(value)
      })

      const totalConvenio = NoCliente.length - 1

      if (totalConvenio === -1) {
        console.log('Total de Convenio = ', 0);
      } else {
        // Otras acciones a realizar si totalPatentes no es igual a -1
        console.log('Total de Convenio = ', totalConvenio);
      }

      pVehiculo.each((i, el) => { //saca la patente del vehiculo cliente o convenio
        let value = $(el).val();
        patent.push(value);
      });

      const totalPatentes = patent.length - 1;
      console.log("Total de Patentes =", totalPatentes);

      //const options = await page.$$('#cuenta option');

      /* for (let u = 1; u < NoCliente2.length; u++) {

        console.log('el valor de U ', [u]); */






        //for Convenio
        for (let w = 1; w < NoCliente.length; w++) {
          console.log('ºse ejecuta for de convenio', NoCliente[w]);

          let valor = NoCliente[w]
          await page.waitForTimeout(2000)
          await page.click("#filterForm")
          await page.click("#cuenta.form-select")
          await page.select("#cuenta.form-select", valor)
          await page.waitForTimeout(2000)

          let alertShown = false;
          if (!alertShown) {
            page.on('dialog', async dialog => {
              console.log(dialog.message());
              await dialog.dismiss();
              alertShown = true; // Marcar que se ha mostrado una alerta
              console.log('SE EJECUTA EL CIERRE DE ');
            });


            //for Patente
            for (let a = 1; a < patent.length; a++) {
              console.log('entro al for de patentes');
              await page.waitForSelector("#filterForm");
              await page.waitForSelector("div:nth-child(5) > button");
              await page.waitForTimeout(2000)


              await page.click("#filterForm > div > div:nth-child(4) > span > span.selection > span > span.select2-selection__arrow")
              const botones = await page.$$("div:nth-child(5) > button");
              await page.select("#patente.form-select", patent[a]);
              await botones[0].click();
              console.log("Patente = ", patent[a]);

              const pageData = await page.evaluate(() => {
                return {
                  html: document.documentElement.innerHTML,
                };
              });

              const $ = cheerio.load(pageData.html);

              const docs = $(".table").length;//id de la tabla

              console.log(docs);

              await page.waitForTimeout(2000);

              if (docs == 0) { //define si es que hay una tabla con datos a extraer
                console.log("documentos no encontrado");

                await page.waitForTimeout(2000);
              } else {
                console.log("--------------------------------");
                page.waitForNavigation()


                // capturar los datos de la tabla

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
                console.log(pagi, "new pag");

                for (k = 0; k < pagi; k++) { //recorrer las paginas
                  const pageData = await page.evaluate(() => {
                    return {
                      html: document.documentElement.innerHTML,
                    };
                  });

                  const $ = cheerio.load(pageData.html);
                  let autos = $(".table tbody tr");
                  autos.each((i, el) => { //recorre los datos de la tabla y los extrae individualmente
                    const getPatente = $("td:nth-child(1)", el).text();
                    const getFecha = $("td:nth-child(2)", el).text();
                    const getHora = $("td:nth-child(4)", el).text();
                    const getPortico = $("td:nth-child(3)", el).text();
                    const getMonto = $("td:nth-child(7)", el).text();
                    const getConcesion = "Vespucio Oriente";
                    data.push({ //guarda los datos de la tabla en las variables establecidas
                      Patente: getPatente,
                      Fecha: getFecha,
                      Hora: getHora,
                      Portico: getPortico,
                      Monto: getMonto,
                      Concesion: getConcesion,
                    });
                  });

                  console.log(data);

                  let siguiente = await page.$("li:nth-child(8) > a");
                  if ((siguiente = siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
                    await page.waitForTimeout(2000);
                    await page.click("li:nth-child(8) > a");
                  } else {
                    console.log(`El cliente ${rut}, sin datos para capturar`);
                    continue;
                  }

                  console.log("-------", k, "--------");

                  conexion.connect((err) => {
                    if (err) {
                      console.log(
                        "A ocurrido un error en la conexion a la base de datos",
                        +err.stack
                      );
                    }
                    console.log(
                      "Conectado a la base de datos =========>" + conexion.threadId
                    );

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

                      console.log(number);

                      conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                        if (err) throw err;
                        console.log(result);
                      });
                    }
                  });

                }

              }

            }//cierra la patente 
          }
        }//cierra el convenio
      //}

    } catch (error) {
      console.log('se ejecuta el catch');
      await page.waitForTimeout(3000);
      await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');

    }
    await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
    await page.waitForTimeout(2500);

  }
};

exports.vespOriente = vespOriente;