const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientes");
const conexion = require("../config/conexion");

const autoVia = async () => {
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
  await page.goto("https://www.autoviasantiagolampa.cl/oficina-virtual/");
  //await page.solveRecaptchas();
  await page.waitForTimeout(3000);

  for (let i = 0; i < clientes.length; i++) {
    //await page.solveRecaptchas();
    await page.waitForTimeout(3000);

    let rut = clientes[i].rut;
    let dv = clientes[i].dv;
    let password = clientes[i].password;
    let cuenta = clientes[i].cuenta;

    try {
      console.log(rut);
      //await page.solveRecaptchas()
      //await page.waitForSelector('.btn.btn-default');
      await page.type('#rut', rut + dv, { delay: 200 });
      await page.waitForTimeout(2000);
      await page.type('#password', password, { delay: 200 });
      await page.waitForTimeout(2000);
      await page.click('#login-form-button')
      await page.waitForNavigation();
      await page.goto('https://oficina.autoviasantiagolampa.cl/transitos-por-facturar');
      //await page.waitForNavigation();
      
      console.log(cuenta);
      console.log('SESION INICIADA = ', rut + ' -', dv);

      await page.waitForTimeout(3000);
      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });

      console.log('---linea 62');

      
      const $ = cheerio.load(pageData.html);
      const docs = $("#main-table").length;//id de la tabla
      console.log('--linea 67', docs);
      if (docs == 0) { //define si es que hay una tabla con datos a extraer
        console.log('no hay registros en la tabla');
        await page.waitForTimeout(3000);
      } else {
          // capturar los datos de la tabla
        const paginas2 = $("#table-pagination-nav").children();
        let pag = parseInt(paginas2.eq(paginas2.length - 2).text());//la cantidad de paginas que tiene la tabla
        console.log('pag',pag);
        /* let pagi = "1"; //establece como predeterminado una pagina de tablas
        if (pag != "") {
          pagi = pag;//hace que cambie el predeterminado por la cantidad real(mayor a 1)
        } */
        console.log('------linea 80');

        let data = [];
        for (k = 0; k < pag; k++) { //recorrer las paginas
          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });
          
          const $ = cheerio.load(pageData.html);
          console.log('pompin');
          let autos = $("#table-body").find('tr');
          autos.each((i, el) => { //recorre los datos de la tabla y los extrae individualmente
            const getPatente = $("td:nth-child(1)", el).text();
            const getFecha = $("td:nth-child(2)", el).text();
            const getHora = $("td:nth-child(3)", el).text();
            const getPortico = $("td:nth-child(4)", el).text();
            const getMonto = $("td:nth-child(5)", el).text();
            const getConcesion = "Auto Via - Lampa";
            data.push({ //guarda los datos de la tabla en las variables establecidas
              Patente: getPatente,
              Fecha: getFecha,
              Hora: getHora,
              Portico: getPortico,
              Monto: getMonto,
              Concesion: getConcesion,
            });
          });
          
          let siguiente = await page.$("#table-pagination-next > a");
          console.log('----linea 111', data);
          if ((siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
            await page.waitForTimeout(3000);
            await page.click("#table-pagination-next > a");
          } else {
            console.log(`El cliente ${rut}, sin datos para capturar`);
            //continue;
          }
          console.log("--linea 120-------", k, "--------");

          //Conexion a la BD
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
              console.log('--------  linea 142 -----------', data[i]);
              conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                if (err) throw err;

              });
            }// cierra los datos con push
          });
        }// cierra recorre paginas
      }//else
      //}

      await page.waitForTimeout(2000)

    } catch (error) {
      console.log('se ejecuta el catch');
      //await page.click('.btn.btn-default');
      await page.goto("https://www.autoviasantiagolampa.cl/oficina-virtual/");

    }
    //await page.click('.btn.btn-default');
    await page.goto("https://www.autoviasantiagolampa.cl/oficina-virtual/");

  }
  console.log('PROCESO FINALIZADO');
  await browser.close();

};

exports.autoVia = autoVia;