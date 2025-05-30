const express = require("express");
const cors = require("cors");
const path = require('path');

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
    this.app.use(express.static(path.resolve(__dirname, "../public")));
  }

  rutas() {
    this.app.use(this.routes.reporte_checadas, require("../routes/reporte"));

    // this.app.get('/main*', (req, res) => {
    //     res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    // });

    // // 3. Catch-all para otras rutas (SPA Fallback)
    // this.app.get(/^\/(?!api|static).*/, (req, res) => {
    //     res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    // });
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Server running in the port ${this.port}`);
    });
  }
}

module.exports = Server;
