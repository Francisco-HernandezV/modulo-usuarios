import mysql from "mysql2";

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",       // tu contraseña de MySQL
  database: "modulo_usuarios"
});

connection.connect((err) => {
  if (err) {
    console.error("Error al conectar con MySQL:", err);
  } else {
    console.log("✅ Conectado a MySQL correctamente.");
  }
});

export default connection;
