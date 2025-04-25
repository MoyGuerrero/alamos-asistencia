const sql = require('mssql');

const configSql = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      options: {
        encrypt: true, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
      }
}
// console.log(configSql)
const dbConnection = async () => {
    try {
        return await sql.connect(configSql);
    } catch (error) {
        console.log(error)
    }
}


module.exports = dbConnection;