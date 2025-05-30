const { Router } = require("express");
const { getReporteAsistencia } = require("../controllers/reporte");
const { check } = require("express-validator");
const validar_campos = require("../middlewares/validar-campos");

const router = Router();
console.log("Reporte /:desde/:hasta")
router.get("/:desde/:hasta",
    [
        check("desde").isISO8601().withMessage('Formato de fecha inválido. Use YYYY-MM-DD').toDate(),
        check("hasta").isISO8601().withMessage('Formato de fecha inválido. Use YYYY-MM-DD').toDate(),
        validar_campos
    ]
    , getReporteAsistencia);

module.exports = router;
