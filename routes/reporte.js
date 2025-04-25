const { Router } = require("express");
const { getReporteAsistencia } = require("../controllers/reporte");

const router = Router();

router.get("/", getReporteAsistencia);

module.exports = router;
