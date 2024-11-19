# TAGS

Scraping a paginas de TAG

# INSTALL

npm install

# RUN

node index.js

felipe tiene que hacer RUTAPASS
estaba siguiendo el metodo que hizo alexis con survia

El cliente 19105142, sin datos para capturar

ResultSetHeader {
fieldCount: 0,
affectedRows: 0,
insertId: 0,
info: '',
serverStatus: 34,
warningStatus: 0
}
await page.waitForSelector("#pagar .form-select");
await page.click("#pagar .form-select")

esto se puede usar sobre una etiqueta select ? await botones[0].click();

Answer :

Share icon
No, la línea de código await botones[0].click(); no se puede utilizar directamente en una etiqueta <select> . El método click() se utiliza para hacer clic en elementos interactivos como botones, enlaces, casillas de verificación, etc.
Para interactuar con una etiqueta <select> en Puppeteer, puedes utilizar métodos específicos como select() , selectOption() , o type() , dependiendo de la acción que deseas realizar. Por ejemplo, para seleccionar una opción en un <select> , puedes usar el método select() proporcionando el valor de la opción que deseas seleccionar.
Aquí tienes un ejemplo de cómo seleccionar una opción en un <select> utilizando Puppeteer:
await page.select('select', 'opcion-valor');
En este caso, reemplaza 'select' con el selector CSS de tu etiqueta <select> , y 'opcion-valor' con el valor de la opción que deseas seleccionar.







await page.select("#patente", patent[a]);
        await botones[0].click();
        console.log("Patente = ", patent[a]);

        const pageData = await page.evaluate(() => {
          return {
            html: document.documentElement.innerHTML,
          };
        });

        await page.waitForTimeout(2000);
        const $ = cheerio.load(pageData.html);

        const docs = $(".table").length;//id de la tabla

        console.log('----linea 100', 'Total documentos=', docs);






        if (docs == 0) { //define si es que hay una tabla con datos a extraer
          console.log("documentos no encontrado");

          await page.waitForTimeout(2000);
        } else {
          console.log(
            "--linea 109------------------"
          );

          /* const pageData = await page.evaluate(() => {
            return {
              html: document.documentElement.innerHTML,
            };
          });

          const $ = cheerio.load(pageData.html); */

          const paginas = $("ul.pagination").children()

          //es para recorrer las paginas de las tablas "next"
          let pag = paginas.eq(paginas.length - 1).text();//la cantidad de paginas que tiene la tabla
          console.log('---linea124');

          let pagi = "1"; //establece como predeterminado una pagina de tablas
          if (pag != "") {
            pagi = pag;//hace que cambie el predeterminado por la cantidad real(mayor a 1)
          }
          console.log(pagi, "---linea 129new pag");

          for (k = 0; k < pagi; k++) { //recorrer las paginas
            console.log('-----linea 132');

            /* const pageData = await page.evaluate(() => {
              return {
                html: document.documentElement.innerHTML,
              };
            });

            const $ = cheerio.load(pageData.html); */

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

            console.log('---linea 159', data);


            /* let siguiente = await page.$('body > section > div > div.row.align-items-center > div:nth-child(2) > nav > ul > li:nth-child(6) > a');
            if ((siguiente = siguiente)) { // valida que se pueda seguir dando siguiente a la pagina de las tablas
              await page.waitForTimeout(2000);
              await page.click('body > section > div > div.row.align-items-center > div:nth-child(2) > nav > ul > li:nth-child(6) > a');
            } else {
              console.log(`El cliente ${rut}, sin datos para capturar`);
              //await page.goto("https://oficina-virtual.survias.cl/logout");
              continue;
            } */

            console.log("----linea 172 -------", k, "--------");

            conexion.connect((err) => {
              console.log('----linea 175 entra a la conexion');
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

                console.log('-----linea 197', number);

                conexion.query(sql, [number], (err, result) => { //guarda los datos que se extrajeron en la base de datos, tambien se vuelve a conectar
                  if (err) throw err;
                  console.log(result);
                });

              }

            });

          }//else

        }




esto hace click en el cuadro de convenio pero nada mas 
        /*  await page.select("#cuenta", NoCliente[b]);
         const optionSelector = `#cuenta option[value="${NoCliente[b]}"]`;
         await page.click(optionSelector)
  */



  