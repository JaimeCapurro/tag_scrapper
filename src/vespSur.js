//ESTE CODIGO SOLO RECORRE EL PRIMER CONVENIO

require("dotenv").config();
const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientes");
const conexion = require("../config/conexion");

const vespSur = async () => {
  //Datos del cliente

  puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: "2captcha",
        token: "4a30647819b70cd484a21535c4ff29fa",
      },
      visualFeedback: true,
    })
  );
  browser = await puppeteer.launch({
    headless: false,
  });
  page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 1080 });
  await page.goto("https://oficina.vespuciosur.cl/sucursal_virtual/login.html");
  //await page.solveRecaptchas();
  await page.waitForTimeout(5000)


  //Carga clientes

  for (i = 0; i < clientes.length; i++) {
    let rut = clientes[i].rut;
    let dv = clientes[i].dv;
    let password = clientes[i].password;
    let cuenta = clientes[i].cuenta;

    try {
      await page.solveRecaptchas();
      await page.waitForSelector("#form1");
      await page.type("#RUT", rut, { delay: 300 });
      await page.type("#RUTDV", dv, { delay: 300 });
      await page.type("#PASSWORD", password, { delay: 300 });
      await page.click("#send");
      await page.waitForNavigation();
      console.log(cuenta);
      console.log('SESION INICIADA = ', rut);

      const pageData = await page.evaluate(() => {
        return { html: document.documentElement.innerHTML, };
      });
      await page.waitForTimeout(2000);
      const $ = cheerio.load(pageData.html);

      //Declaro variables
      await page.waitForTimeout(2000);

      //await page.waitForSelector(".select-cool")
      //await page.waitForSelector("#Form1")

      const selec = $("#Convenio OPTION");
      //let pVehiculo = $("div:nth-child(6) div select OPTION")
      const NoCliente = [];
      let patent = [];
      let data = [];

      selec.each((i, el) => { //saca el num de convenio
        let value = $(el).val();
        NoCliente.push(value);
      });



      console.log('Convenios = ', NoCliente.length);
      await page.waitForTimeout(2000);

      //recorrer los convenios
      for (let x = 0; x < NoCliente.length; x++) {

        await page.waitForSelector(".select-cool")
        //await page.waitForSelector("#Form1")


        await page.waitForTimeout(2000)
        console.log('linea 72')
        console.log('Convenio Seleccionado = ', NoCliente[x])

        let valor = NoCliente[x]


        //await page.click(".select-cool")
        //await page.click("#Convenio")
        await page.select("#Convenio", valor)
        await page.waitForTimeout(2000)
        await page.click("body > form > section > div > div.convenio.col.two-third.cf > div:nth-child(4) > nav > ul > li:nth-child(5) > a")
        await page.waitForNavigation()
        await page.waitForTimeout(2000)



        const pageData = await page.evaluate(() => {
          return { html: document.documentElement.innerHTML, };
        });
        await page.waitForTimeout(2000);
        const $ = cheerio.load(pageData.html);
        let pVehiculo = $("div:nth-child(6) div select OPTION")

        pVehiculo.each((i, el) => { //saca el num de convenio
          let value = $(el).val();
          patent.push(value);
        });
        console.log('patentes=', patent.length);

        //no borrar , esto clickea el boton de volver
        //const botones = await page.$$("div:nth-of-type(3) > a.orange_btn");
        //await botones[0].click()

        //for de patentes
        for (let r = 1; r < patent.length; r++) {

          await page.waitForSelector("div:nth-child(6) div select")
          await page.click("div:nth-child(6) div select")

          let patente = patent[r]
          await page.select("div:nth-child(6) div select", patente)
          const botones = await page.$$("div:nth-of-type(2) > a");
          await botones[0].click()


          await page.waitForTimeout(2000);

          const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });
          const $ = cheerio.load(pageData.html);

          await page.waitForTimeout(3000)

          const docs = $("#Form1 > section > div > div.col.full.cf > div.standard-box > div > table").length;//id de la tabla
          console.log("--linea 116", docs);

          if (docs == 0) { //define si es que hay una tabla con datos a extraer
            console.log("documentos no encontrado");

            //no borrar , esto clickea el boton de volver
            //const botones = await page.$$("div:nth-of-type(3) > a.orange_btn");
            //await botones[0].click()

            await page.waitForTimeout(2000);
          } else {
            console.log("--linea 153------------------");
            page.waitForNavigation();

            //capturar datos de la tabla

            const valoresNumeros = []
            sumaTotal = 0
            let sonIguales = false

            while (!sonIguales) {

              console.log('entra al while');
              await page.waitForTimeout(3000)

              const pageData = await page.evaluate(() => {
                return {
                  html: document.documentElement.innerHTML,
                };
              });

              const $ = cheerio.load(pageData.html);
              await page.waitForTimeout(3000)

              //async function obtenerDatosPagina(page) {

              //extraer monto total y suma total de monto en la tabla. Quiero hacer que haga clicks cuando el total no se cumpla
              const montoLabel = await page.$('#Form1 > section > div > div.col.full.cf > div.inner-content.cf > div:nth-child(2) > div:nth-child(15) > div > label');
              const montoLabel2 = await page.$('#Form1 > section > div > div.col.full.cf > div.inner-content.cf > div:nth-child(2) > div:nth-child(17) > div > label')
              const montoLabel3 = await page.$("#Form1 > section > div > div.col.full.cf > div.inner-content.cf > div:nth-child(2) > div:nth-child(19) > div > label")

              let tdElements = $('table tbody tr td:last-child');
              //var numeros = []
              //const valoresNumeros = []
              let montoValue = 0
              let montoValue3 = 0
              let montoValue2 = 0

              //console.log('----linea 191', valoresNumeros);
              await page.waitForTimeout(1000)

              //primer label
              if (montoLabel) {
                let montoText = await montoLabel.evaluate(node => node.textContent);
                montoValue = parseFloat(montoText.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
                console.log('---linea 155 Monto:', montoValue);

              } else {
                console.log('Etiqueta de monto no encontrada.');
              }
              await page.waitForTimeout(1000)

              //segundo label
              if (montoLabel2) {
                let montoText2 = await montoLabel2.evaluate(node => node.textContent);
                montoValue2 = parseFloat(montoText2.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
                console.log('---linea 165 Monto:', montoValue2);

                //montoValue += montoValue2;

              } else {
                console.log('Etiqueta de monto no encontrada.');
              }
              await page.waitForTimeout(1000)

              //segundo label
              if (montoLabel3) {
                let montoText3 = await montoLabel3.evaluate(node => node.textContent);
                montoValue3 = parseFloat(montoText3.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));


                console.log('---linea 177 Monto:', montoValue3);

                //montoValue += montoValue3;

              } else {
                console.log('Etiqueta de monto no encontrada.');
              }

              await page.waitForTimeout(2000)
              tdElements.each(function () {
                let montoText = $(this).text();
                let value = parseFloat(montoText.replace(/\./g, '').replace(',', '.'));
                valoresNumeros.push(value);
                //sumaTotal += value
                //console.log('--linea 185 ', sumaTotal);
              })

              await page.waitForTimeout(2000)
              let sumaValores = montoValue + montoValue2 + montoValue3
              console.log('----linea 202 suma total de concepto', sumaValores);

              sumaTotal = valoresNumeros.reduce((acumulador, valor) => acumulador + valor, 0);
              console.log('--linea 205', sumaTotal);
              console.log('----linea 206 suma total de columna', valoresNumeros);


              let sonIguales = /* montoValue == sumaTotal; */ sumaValores == sumaTotal
              console.log('False = no son iguales . True = son iguales ', sonIguales); // Esto imp
              await page.waitForTimeout(2000)


              let autos = $('#Form1 > section > div > div.col.full.cf > div.standard-box > div > table tbody tr:not(:first-child)');
              autos.each((i, el) => {

                const getFecha = $("td:nth-child(1)", el).text();
                const getHora = $("td:nth-child(2)", el).text();
                const getPatente = $("td:nth-child(3)", el).text();
                const getPortico = $("td:nth-child(5)", el).text();
                const getMonto = $("td:nth-child(8)", el).text();
                const getConcesion = "Vespucio Sur";
                data.push({
                  patente: getPatente,
                  fecha: getFecha,
                  hora: getHora,
                  portico: getPortico,
                  monto: getMonto,
                  concesion: getConcesion,
                });
              });

              console.log('----linea 235', data);

              //console.log('---linea 220 ', k);
              await page.waitForTimeout(2000)

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
                    data[i].fecha,
                    data[i].hora,
                    data[i].patente,
                    data[i].portico,
                    data[i].monto,
                    data[i].concesion
                  );

                  conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                    if (err) throw err;
                  });
                }
              });


              if (!sonIguales) {
                console.log('es falso');
                await page.waitForSelector("div.standard-box a:nth-of-type(3)")
                await page.click("div.standard-box a:nth-of-type(3)") //id boton para clickear siguiente
                await page.waitForTimeout(2000)

                console.log('----se hizo click ');
                await page.waitForTimeout(2000)

              } else {
                console.log('es verdadero');
                console.log('salgo del bucle');
                //const botones = await page.$$("div:nth-of-type(3) > a.orange_btn");
                //await botones[0].click()
                break;
              }

              //}

              //await obtenerDatosPagina(page);
            } //cierre de while
          }
        }//cierre de patentes

        console.log("--linea 250------------");
        await page.waitForTimeout(5000);
        await page.goto("https://oficina.vespuciosur.cl/sucursal_virtual/login.html")

      }
    } catch (error) {
      console.log(
        `Error en la ejecucion del programa, cliente ${rut}, error ${error}`
      );
      await page.goto("https://oficina.vespuciosur.cl/sucursal_virtual/login.html")
      console.log("se ejecuta el catch linea 205")
      continue;
    };//cierre try catch
  }
  await page.waitForTimeout(1000);
  await browser.close();
};

exports.vespSur = vespSur;
