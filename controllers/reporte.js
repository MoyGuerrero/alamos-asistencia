const { response } = require("express");
const exceljs = require("exceljs");
const path = require('path');
const ResponseHandler = require("../model/response");
const dbConnection = require("../db/db");

const getReporteAsistencia = async (req, res = response) => {
  try {
    const pool = await dbConnection();

    const { recordset } = await pool.request().query(`SELECT 
                                m.Nombre AS NOMBRE,
                                m.Fecha as FECHA,
                                COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Entrada' THEN CONVERT(VARCHAR(8), m.Hora, 108) END),'Sin registro') AS ENTRADA,
                                --COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Comida' THEN CONVERT(VARCHAR(8), m.Hora, 108) END),'Sin registro') AS SALIDA_COMIDA,
                                COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Salida' THEN CONVERT(VARCHAR(8), m.Hora, 108) END),'Sin registro') AS SALIDA,
                                COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Sin evento' THEN CONVERT(VARCHAR(8), m.Hora, 108) END),'Sin registro') AS EXTRA
                        FROM Marcajes m
                        --where m.uid = 5
                        GROUP BY m.Nombre, m.Fecha
                        ORDER BY m.Fecha, m.Nombre;`);
    const formatoExcel = [];
    const encabezados = ["Fecha", "Entrada", "Salida", "Extra"];

    recordset.forEach((element) => {
      // Buscar si ya existe el nombre
      let persona = formatoExcel.find((p) => p.nombre === element.NOMBRE);
      if (!persona) {
        persona = { nombre: element.NOMBRE, asistencias: [] };
        formatoExcel.push(persona);
      }

      persona.asistencias.push({
        fecha: element.FECHA,
        entrada: element.ENTRADA,
        salida: element.SALIDA,
        extra: element.EXTRA,
      });
    });

    const libroExcel = new exceljs.Workbook();

    let inicioColumnaNombre = 9;
    const pathFile = path.resolve(__dirname,'../report/reporte_asistencia_v2.xlsx');

    // await libroExcel.xlsx.readFile("C:/reporte_asistencia/reporte_asistencia.xlsx");
    await libroExcel.xlsx.readFile(pathFile);

    const sheet = libroExcel.getWorksheet("Hoja1");

    for (let i = 0; i < formatoExcel.length; i++) {
        // Combinar celdas para el nombre
        sheet.mergeCells(`B${inicioColumnaNombre}:E${inicioColumnaNombre}`);
        
        // Formatear celda del nombre
        const nombreCell = sheet.getCell(`B${inicioColumnaNombre}`);
        nombreCell.value = separarNombre(formatoExcel[i].nombre);
        nombreCell.alignment = { 
            horizontal: "center", 
            vertical: "middle" 
        };
        nombreCell.font = { 
            size: 14, 
            bold: true,
            color: { argb: '000000' }
        };
        
        // inicioColumnaNombre++;
        
        // Escribir asistencias
        for (let j = 0; j < formatoExcel[i].asistencias.length; j++) {
            sheet.getCell(`F${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].fecha;
            sheet.getCell(`G${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].entrada;
            sheet.getCell(`H${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].salida;
            sheet.getCell(`I${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].extra;
            inicioColumnaNombre++;
        }
        
        // Opcional: espacio entre empleados
        // inicioColumnaNombre++;
    }

    const now = new Date();
    const fechaFormateada = now.toISOString().split("T")[0];
    const horaFormateada = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const fileName = `Archivo_Asistencia_${fechaFormateada}_${horaFormateada}.xlsx`;

    const buffer = await libroExcel.xlsx.writeBuffer();
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
    // ResponseHandler.respuesta(res, "Sucess", 200, formatoExcel);
  } catch (error) {
    ResponseHandler.respuesta(res, error.message, 500, []);
  }
};

function separarNombre(nombre) {
  return nombre.replace(/([A-Z])/g, " $1").trim(); // Elimina espacios al inicio/fin si los hubiera
}

module.exports = {
  getReporteAsistencia,
};
