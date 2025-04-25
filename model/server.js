const express = require("express");
const cors = require("cors");

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || "3001";
    this.routes = {
      reporte_checadas: "/api/reporte",
    };

    this.middlewares();
    this.rutas();
  }

  middlewares() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  rutas() {
    this.app.use(this.routes.reporte_checadas, require("../routes/reporte"));
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Server running in the port ${this.port}`);
    });
  }
}

module.exports = Server;
