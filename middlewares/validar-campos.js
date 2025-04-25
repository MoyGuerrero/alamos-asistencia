const { response } = require("express");
const { validationResult } = require("express-validator");
const ResponseHandler = require("../model/response");

const validar_campos = (req, res = response, next) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        ResponseHandler.respuesta(res,'Errors',404,errors);
        return
    }
    next();

};

module.exports = validar_campos;
