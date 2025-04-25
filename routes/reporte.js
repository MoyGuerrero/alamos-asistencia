const { Router } = require("express");
const { getReporteAsistencia } = require("../controllers/reporte");
const { check } = require("express-validator");
const validar_campos = require("../middlewares/validar-campos");

const router = Router();

router.get("/:desde/:hasta",
    [
        check("desde").isISO8601().withMessage('Formato de fecha inválido. Use YYYY-MM-DD').toDate().customSanitizer(value => value.toISOString().split('T')[0]),
        check("hasta").isISO8601().withMessage('Formato de fecha inválido. Use YYYY-MM-DD').toDate().customSanitizer(value => value.toISOString().split('T')[0]),
        validar_campos
    ], getReporteAsistencia);

module.exports = router;
