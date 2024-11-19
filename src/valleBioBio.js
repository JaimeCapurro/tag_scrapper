const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const conexion = require("../config/conexion");
const clientesBiobio = require("../client/clientesBiobio");

const valleBioBio = async () => {
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
  await page.goto("http://186.10.18.67/Cuenta/Login?ReturnUrl=%2FHome%2FIndex");
  await page.waitForTimeout(3000);

  //Carga clientes

  for (i = 0; i < clientesBiobio.length; i++) {
    let rut = clientesBiobio[i].rut;
    let password = clientesBiobio[i].password;
    let cuenta = clientesBiobio[i].cuenta

    //Romper captcha

    try {
      await page.goto("http://186.10.18.67/Cuenta/Login?ReturnUrl=%2FHome%2FIndex");
      await page.waitForTimeout(2000);
      await page.type("#RUT", rut, { delay: 300 });
      await page.type("#Contrasenia", password, { delay: 300 });
      console.log('SESION INICIADA = ', rut );
      console.log(cuenta);
      await page.click("#btnGuardar");
      await page.waitForTimeout(2000);
      await page.click("#wrapper > div.container > section > div > div.row > div:nth-child(3) > div:nth-child(2) > h4 > a:nth-child(2)")
      await page.waitForTimeout(2000)


      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      const $ = cheerio.load(pageData.html);

      let selec = $('table tbody tr td:first-child a')
      noCliente = []
      let data = []

      selec.each((i, el) => {
        let value = $(el).text();
        noCliente.push(value)
      })

      console.log('---linea 67', noCliente.length);
      console.log(noCliente);

      let ejecutarDespues = false;


      for (let a = 0; a < noCliente.length; a++) {
        await page.goto("http://186.10.18.67/Transito/Index")

        const url = ("http://186.10.18.67")
        const href = selec[a].attribs.href;
        const full = url + href

        await page.goto(full)
        await page.waitForTimeout(4000)

        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });
        const $ = cheerio.load(pageData.html);
        //const docs = $("#grid-data").length;//id de la tabla

        await page.waitForTimeout(8000)

        let autos = $("#grid-data tbody tr");
        autos.each((i, el) => { //recorre los datos de la tabla y los extrae individualmente
          const getPatente = $("td:nth-child(1)", el).text();
          const getFecha = $("td:nth-child(2)", el).text();
          const getHora = $("td:nth-child(5)", el).text();
          const getPortico = $("td:nth-child(3)", el).text();
          const getMonto = $("td:nth-child(6)", el).text();
          const getConcesion = "Valles del Bio Bio";
          data.push({ //guarda los datos de la tabla en las variables establecidas
            Patente: getPatente,
            Fecha: getFecha,
            Hora: getHora,
            Portico: getPortico,
            Monto: getMonto,
            Concesion: getConcesion,
          });
        });

        //console.log('----linea 133', data);

        conexion.connect((err) => {
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

            });
          }// cierra los datos con push
        });



        console.log('---linea 143');
        await page.click("#wrapper > div.container > section > div > div > div:nth-child(1) > a")

        // console.log('---linea 141 aqui abajo el click para retroceder');
        //await page.goto("http://186.10.18.67/Transito/Index")
        console.log('---linea 144 click para cerrar sesion ');

        if (a === noCliente.length - 1) {
          ejecutarDespues = true;
        }

        if (ejecutarDespues) {
          // Realiza alguna acción después de que el bucle haya terminado
          //console.log("Este código se ejecuta después de recorrer todos los elementos.");
          await page.waitForTimeout(3000)
          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });
          const $ = cheerio.load(pageData.html);
          await page.waitForTimeout(3000)
          //console.log('--linea 96aqui deberia salir ? ');
          const link = $('a:contains("Cerrar Sesión")');
          const javascriptCode = link.attr('href');
          await page.waitForTimeout(3000)
          await page.evaluate(javascriptCode);
          await page.waitForTimeout(3000)

        }

      }//cierre del for

    } catch (error) {
      console.log(error);
      console.log('se ejecuta el catch');
      await page.goto("http://186.10.18.67/Transito/Index")

    }// cierre try
    await page.goto("http://186.10.18.67/Transito/Index")

  }//cierra for de clientes
  console.log('PROCESO FINALIZADO');
  await browser.close();

};
exports.valleBioBio = valleBioBio;
