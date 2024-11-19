const mysql = require("mysql2");

const conexion = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "testing",
});

//validacion

conexion.connect((err) => {
  if (err) {
    console.log(
      "A ocurrido un error en la conexion a la base de datos",
      +err.stack
    );
  }
  console.log("Conectado a la base de datos ->"+  "("+conexion.threadId+")");
});

module.exports = conexion;