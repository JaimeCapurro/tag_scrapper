//Este codigo es para extraer patentes del convenio 0040008781641001 
//Tambien extrae patentes en caso de que no existan convenios

const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientes");
const conexion = require("../config/conexion");

const vespOriente2 = async () => {
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

    //console.log('Usuario = ', rut + dv)

    try {

      await page.solveRecaptchas();
      await page.waitForSelector("#loginPublico");
      //console.log('Ingresando Datos');
      await page.type("#email", rut + dv, { delay: 200 });
      await page.type("#password", clientes[i].password, { delay: 200 });
      await page.click(".btn.btn-primary.btn-block");
      await page.waitForNavigation();
      console.log(cuenta);
      console.log('SESION INICIADA = ', rut + '-', dv);
      await page.goto("https://www.avo.cl/cliente/detalle_viajes");
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
      let selec = $("#cuenta OPTION");
      let NoCliente = []; //array de convenio
      
      

      selec.each((i, el) => {
        let value = $(el).val();
        NoCliente.push(value);
      });
      //console.log('Total de Convenios = ', NoCliente);

      //for Convenio
      //console.log("se ejecuta for de convenio");
      /*
      try {
        let valor = NoCliente[2];
        await page.waitForTimeout(2000);
        await page.waitForSelector("#cuenta");
        await page.select("#cuenta", valor);
        await page.waitForTimeout(2000);

      } catch (error) { console.log('se ejecuta el catch1'); }

      /* let valor = NoCliente[2];
      await page.waitForTimeout(2000);
      await page.waitForSelector("#cuenta");
      await page.select("#cuenta", valor);*/
      await page.waitForTimeout(2000); 

      
      //for Patente
      const convenios = await page.$("#cuenta");
      
      if (convenios) {
        selectSelector = "#cuenta";
        await page.click(selectSelector);
        
        // Extract the number of options and their values
        const options = await page.evaluate((selectSelector) => {
          const selectElement = document.querySelector(selectSelector);
          if (selectElement) {
              // Return an array of option values and texts
              return Array.from(selectElement.options).map(option => ({
                  value: option.value,
                  text: option.textContent.trim()
              }));
          }
          return []; // Return an empty array if <select> element is not found
        }, selectSelector);

        // Log the number of options
        //console.log(`Number of options: ${options.length}`);
        
        for ( i = 1; i< options.length; i++ ) {
          const option = options[i];
          const optionValueToSelect = option.value;
          
          await page.evaluate((selectSelector, optionValueToSelect) => {
              const selectElement = document.querySelector(selectSelector);
              
              if (selectElement) {
                  selectElement.value = optionValueToSelect; // Set the value
                  const event = new Event('change', { bubbles: true });
                  selectElement.dispatchEvent(event); // Dispatch the change event
              }
            }
          , selectSelector, optionValueToSelect);
          
          
          await page.waitForSelector("#patente");
          console.log("waitforselector"); //llega aqui
          await page.waitForFunction(
            (selector) => document.querySelector(selector).options.length > 1,
            {},
            "#patente"
          );
          //console.log("waitforoptions");
          await page.click("#cuenta");
          //console.log("clickcuenta")
          await page.click(".select2-container");
          await page.click(".select2-container");
          console.log("clickformselect")
          
          //await page.click("#patente.form-select");
          //console.log("clickformselect2")
          await page.waitForTimeout(2000);
          await iterarPatentes();
        }

      }else {
        await iterarPatentes();
      }
      
      

    } catch (error) {
      console.log('se ejecuta el catch2');
      await page.waitForTimeout(2000);
      await page.waitForSelector(".logout-nav")
      await page.waitForTimeout(3000);
      await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
      await page.waitForTimeout(2000);
    }

    //await page.goto("https://www.avo.cl/alternativo/login");
    await page.waitForTimeout(2000);
    await page.waitForSelector(".logout-nav")
    await page.waitForTimeout(3000);
    await page.click('body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2');
    await page.waitForTimeout(2000);

    /* await page.click(
      "body > div.navbar-wrap > nav > div > a.logout-nav.order-lg-2"
    ); */
    await page.waitForTimeout(2500);
  }
  console.log('PROCESO FINALIZADO');
  await browser.close();

};

const iterarPatentes = async () => {
  let data = [];
  let patent = [];
  await page.click(".select2-container");
  const updatedHtml = await page.content();
  const x = cheerio.load(updatedHtml);
  patent.length = 0
  
  
  //let bomb = await page.waitForSelector('.select2-results__option');
  //console.log(bomb);
  
  let pVehiculo = x(".select2-results__option");
  //console.log(pVehiculo);
  pVehiculo.each((i, el) => {
    //saca la patente del vehiculo cliente o convenio
    let value = x(el).text();
    //console.log(`Selected option: ${value}`);
    patent.push(value);
  });
  //console.log("PATENTES = ", patent);
  //await page.waitForTimeout(2000);
  
  

  for (let a = 1; a < patent.length; a++) {
    
    await page.click(".select2-container");
    
    //await page.waitForSelector('.select2-results__options', { visible: true });
    await page.waitForTimeout(1000);
    const options = await page.$$('#select2-patente-results .select2-results__option'); //<------

    //const options = await page.evaluate(() => {
    //  return Array.from(document.querySelectorAll('.select2-results__option')).map(option => option.textContent);
    //});
    console.log("******")
    
    const optionText = await page.evaluate(el => el.textContent, options[a]);
    await page.evaluate(text => {
        const option = Array.from(document.querySelectorAll('.select2-results__option')).find(opt => opt.textContent === text);
        if (option) {option.click()};
    }, optionText);
  
  
    
    //await options[a].click();
    
    //await page.waitForSelector("#cuenta");
    //await page.waitForSelector("div:nth-child(5) > button");
    await page.waitForTimeout(2000);
    
    //await page.click("#filterForm > div > div:nth-child(4) > span > span.selection > span > span.select2-selection__arrow")
    //const botones = await page.$$("div:nth-child(5) > button");
    //await page.select("#patente.form-select", patent[a]);
    
    await page.waitForSelector('button.btn.btn-pagar');
    await page.click("button.btn.btn-pagar")
    console.log("btn pagar");
    //await botones[0].click();//

    console.log("Patente = ", patent[a]);

    const pageData = await page.evaluate(() => {
      return {
        html: document.documentElement.innerHTML,
      };
    });
    console.log("*");
    const $ = cheerio.load(pageData.html);
    console.log("**");
    const docs = $(".table").length; //id de la tabla
    console.log("***");
    console.log(docs);

    await page.waitForTimeout(2000);

    if (docs == 0) {
      //define si es que hay una tabla con datos a extraer
      //console.log("documentos no encontrado");

      await page.waitForTimeout(2000);
    } else {
      console.log("--------------------------------");
      page.waitForNavigation();

      // capturar los datos de la tabla

      const pageData = await page.evaluate(() => {
        return {
          html: document.documentElement.innerHTML,
        };
      });
      const $ = cheerio.load(pageData.html);
      const paginas = $("ul.pagination").children(); //es para recorrer las paginas de las tablas "next"

      let pag = paginas.eq(paginas.length - 2).text(); //la cantidad de paginas que tiene la tabla

      let pagi = "1"; //establece como predeterminado una pagina de tablas
      if (pag != "") {
        pagi = pag; //hace que cambie el predeterminado por la cantidad real(mayor a 1)
      }
      //console.log(pagi, "new pag");

      for (k = 0; k < pagi; k++) {
        //recorrer las paginas
        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });

        const $ = cheerio.load(pageData.html);
        let autos = $(".table tbody tr");

        const noDeseado =
          "La búsqueda realizada no arroja resultados. Si no encuentra los\n" +
          "                                        viajes que está buscando intente modificando los filtros.";

        let foundNoDeseado = false; // Bandera para indicar si se ha encontrado la etiqueta no deseada

        autos.each((i, el) => {
          //console.log('---linea 195entro al each'); //recorre los datos de la tabla y los extrae individualmente
          const getPatente = $("td:nth-child(1)", el).text();
          const getFecha = $("td:nth-child(2)", el).text();
          const getHora = $("td:nth-child(4)", el).text();
          const getPortico = $("td:nth-child(3)", el).text();
          const getMonto = $("td:nth-child(7)", el).text();
          const getConcesion = "Vespucio Oriente2";

          if ($(el).text().includes(noDeseado)) {
            console.log("Se encontró la etiqueta no deseada. El each se detendrá.");
            foundNoDeseado = true; // Establecer la bandera en true si se encuentra la etiqueta
            return false; // Detener el each()
          }
          
          data.push({
            //guarda los datos de la tabla en las variables establecidas
            Patente: getPatente,
            Fecha: getFecha,
            Hora: getHora,
            Portico: getPortico,
            Monto: getMonto,
            Concesion: getConcesion,
          });
        });

        console.log(data);

        if (foundNoDeseado) {
          // Si se encontró la etiqueta no deseada, no se agregan los datos al array y se hace lo que necesites hacer en ese caso.
          //console.log("Se encontró la etiqueta no deseada. El procesamiento se detendrá.");
        } else {
          //console.log("Procesamiento exitoso. Se agregaron los datos al array 'data'.");
        }

        //console.log(data);
      

        let siguiente = await page.$('a[aria-label="Siguiente »"]');
        
        if (siguiente) {
          // valida que se pueda seguir dando siguiente a la pagina de las tablas
          console.log('----linea 324'); //
          await page.waitForTimeout(2000);
          await page.click('a[aria-label="Siguiente »"]');

        } else {
          console.log(`El cliente, sin datos para capturar`);
          //continue;
        }

        console.log("-------", "--------"); //---

        conexion.connect((err) => {
          if (err) {
            console.log(
              "A ocurrido un error en la conexion a la base de datos",
              +err.stack
            );
          }
          console.log("Conectado a la base de datos =========>" + conexion.threadId);

          const sql = "CALL pa_insertarDatosNest (?)"; //se define el llamado al procedimiento almacenado en la variable 'sql'

          for (let i = 0; i < data.length; i++) {
            //se recorren los datos que extrajo el push
            const number = new Array(
              data[i].Fecha,
              data[i].Hora,
              data[i].Patente,
              data[i].Portico,
              data[i].Monto,
              data[i].Concesion
            );

            //console.log(number);

            conexion.query(sql, [number], (err, result) => {
              //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
              if (err) throw err;
              //console.log(result);
              //console.log("----linea 250 resultado ");
            });
          }
        });
      }
    }
  }
  //cierra la patente
}

exports.vespOriente2 = vespOriente2;
