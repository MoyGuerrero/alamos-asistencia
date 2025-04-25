class ResponseHandler {
  static respuesta(res, msg, status, data) {
    return res.status(status).json({
      msg,
      data,
      status,
    });
  }
}
module.exports = ResponseHandler;