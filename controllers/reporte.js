const { response } = require("express");
const { format } = require("date-fns");
const moment = require("moment");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const exceljs = require("exceljs");

const ResponseHandler = require("../model/response");
const dbConnection = require("../db/db");

const getReporteAsistencia = async (req, res = response) => {
  try {
    let { desde, hasta } = req.params;

    const pool = await dbConnection();

    const { recordset } = await pool
      .request()
      .input("desde", desde)
      .input("hasta", hasta).query(`SELECT 
                                                m.Nombre AS NOMBRE,
                                                m.Fecha as FECHA,
                                                COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Entrada' THEN CONVERT(VARCHAR(8), m.Hora, 108) END),'Sin registro') AS ENTRADA,
                                                --COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Comida' THEN CONVERT(VARCHAR(8), m.Hora, 108) END),'Sin registro') AS SALIDA_COMIDA,
                                                COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Salida' THEN CONVERT(VARCHAR(8), m.Hora, 108) END),'Sin registro') AS SALIDA,
                                                COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Sin evento' THEN CONVERT(VARCHAR(8), m.Hora, 108) END),'Sin registro') AS EXTRA
                                        FROM Marcajes m
                                        where m.Fecha BETWEEN @desde and @hasta
                                        GROUP BY m.Nombre, m.Fecha
                                        ORDER BY m.Nombre;`);
    // m.uid = 5 <--- si se requiere buscar por el uid del empleado, este es el de checador
    const formatoExcel = [];

    recordset.forEach((element) => {
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

    const html = await generarPDF(formatoExcel, desde, hasta);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-web-security"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"], // Espera a recursos
    });

    const outputFolder = "C:/PDF/Asistencias";
    const fileNamePDF = `reporte-asistencia-Cuauhtemoc-Chihuahua-${Date.now()}.pdf`;
    const fullPath = path.join(outputFolder, fileNamePDF);

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // 3. Genera y guarda el PDF
    await page.pdf({
      path: fullPath,
      format: "A4",
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true, // Para fondos/imágenes
      preferCSSPageSize: true, // Respeta @page en CSS
    });

    await browser.close();

    const libroExcel = new exceljs.Workbook();

    let inicioColumnaNombre = 9;
    const pathFile = path.resolve(
      __dirname,
      "../report/reporte_asistencia_v2.xlsx"
    );

    await libroExcel.xlsx.readFile(pathFile);

    const sheet = libroExcel.getWorksheet("Hoja1");

    let message = `Reporte generado a las fechas ${desde} - ${hasta}`;

    sheet.getCell("F4").value = message;

    for (let i = 0; i < formatoExcel.length; i++) {
      // Combinar celdas para el nombre
      sheet.mergeCells(`B${inicioColumnaNombre}:E${inicioColumnaNombre}`);

      // Formatear celda del nombre
      const nombreCell = sheet.getCell(`B${inicioColumnaNombre}`);
      nombreCell.value = separarNombre(formatoExcel[i].nombre);
      nombreCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      nombreCell.font = {
        size: 14,
        bold: true,
        color: { argb: "000000" },
      };

      // inicioColumnaNombre++;

      // Escribir asistencias
      for (let j = 0; j < formatoExcel[i].asistencias.length; j++) {
        sheet.getCell(`F${inicioColumnaNombre}`).value =
          formatoExcel[i].asistencias[j].fecha;
        sheet.getCell(`G${inicioColumnaNombre}`).value =
          formatoExcel[i].asistencias[j].entrada;
        sheet.getCell(`H${inicioColumnaNombre}`).value =
          formatoExcel[i].asistencias[j].salida;
        sheet.getCell(`I${inicioColumnaNombre}`).value =
          formatoExcel[i].asistencias[j].extra;
        inicioColumnaNombre++;
      }

      // Opcional: espacio entre empleados
      // inicioColumnaNombre++;
    }

    sheet.name = "Cuauhtemoc,Chihuahua";

    const now = new Date();
    const fechaFormateada = now.toISOString().split("T")[0];
    const horaFormateada = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const fileName = `Reporte_Asistencia_Cuauhtemoc_Chihuahua_${fechaFormateada}_${horaFormateada}.xlsx`;

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

const generarPDF = async (datos, desde, hasta) => {
  const pathFile = path.join(
    __dirname,
    "../template/template_horarios_v2.html"
  );
  const template = await fs.readFileSync(pathFile, "utf8");

  let registroEmpleado = "";

  datos.forEach((dato) => {
    let row = "";

    for (let i = 0; i < dato.asistencias.length; i++) {
      row += `<tr>
                 <td>${
                   dato.asistencias[i].fecha.toISOString().split("T")[0]
                 }</td>
                 <td>${dato.asistencias[i].entrada}</td>
                 <td>${dato.asistencias[i].salida}</td>
                 <td>${dato.asistencias[i].extra}</td>
              </tr>`;
    }

    const logoPath = path.join(__dirname, "../images/LosAlamos-logo1-azul.jpg");
    const a = fs.readFileSync(logoPath).toString("base64");

    const logoBase64 = fs.readFileSync(logoPath, "base64");

    /*registroEmpleado += `<div class="employee-section">
                                <div class="logo">
                                  <img src="data:image/jpeg;base64,${logoBase64}" alt="logo" style="margin-top:1px; margin-right:3px ;">
                                </div>
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div class="text-start">
                                    <label class="font-bold">Nombre: <span style="font-weight: 500; font-size: 7px;">${separarNombre(dato.nombre)}</span></label>
                                </div>
                                <div class="text-start">
                                    <label class="font-bold">Semana: <span style="font-weight: 500; font-size: 7px;">${desde.toISOString().split("T")[0]} - ${hasta.toISOString().split("T")[0]}</span></label>
                                </div>
                          </div>
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                              <div class="text-start">
                                <label class="font-bold">Sucursal: <span style="font-weight: 500; font-size: 7px;">Cuauhtemoc, Chih</span></label>
                              </div>
                              <div class="text-start">
                                <label class="font-bold">Direccion: <span style="font-weight: 500; font-size: 7px;">Km 14 Carretera Álvaro Obregón #1417 Plaza Ontario Local 11</span></label> 
                              </div>
                          </div>

                          <div style="padding: 4px 15px; margin-top: 20px;">
                              <table class="table">
                                  <thead>
                                    <tr>
                                        <td>Fecha</td>
                                        <td>Entrada</td>
                                        <td>Salida</td>
                                        <td>Extra</td>
                                    </tr>
                                  </thead>
                                <tbody>
                                ${row}
                                </tbody>
                              </table>
                          </div>

                            <footer style="position:sticky; top:0; left:0">
                              <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: end; margin-top: 30px;">
                                  <div style="border: 1px solid black; width: 30%;"></div>
                                  <label>${separarNombre(dato.nombre)}</label>
                              </div>
                            </footer>
                         </div>`;*/
    registroEmpleado +=
      '<div class="cuadro" style="grid-row: 1 / 3;">' +
      '     <div class="logo" style="background-image: url(\'data:image/jpeg;base64,' + logoBase64 + '\');background-position: center;background-size: cover;background-repeat: no-repeat;"></div>' +
      '     <div class="texto1">' +
      '         <div class="rotate-90">' +
      '           <label class="title">Fechas:</label>' +
      '           <span class="subtitle">'+desde.toISOString().split("T")[0]+' al '+hasta.toISOString().split("T")[0]+'</span>' +
      "         </div>" +
      '         <div class="rotate-90">' +
      '           <label class="title">Nombre</label>' +
      '           <span class="subtitle">'+separarNombre(dato.nombre)+'</span>' +
      "         </div>" +
      "     </div>" +
      '     <div class="texto2">' +
      '         <div class="rotate-90">' +
      '           <label class="title">Direccion:</label>' +
      '           <span class="subtitle"> Calle 1a. Ote. 306, Oriente 1</span>' +
      "         </div>" +
      '         <div class="rotate-90">' +
      '           <label class="title">Sucursal</label>' +
      '           <span class="subtitle">Delicias,Chihuahua</span>' +
      '         </div>' +
      '      </div>' +
      '      <div class="tabla">' +
      '          <table class="table">' +
      "             <thead>" +
      "                 <tr>" +
      "                   <td>Fecha</td>" +
      "                   <td>Entrada</td>" +
      "                   <td>Salida</td>" +
      "                   <td>Extra</td>" +
      "                  </tr>" +
      "             </thead>" +
      "             <tbody>" +
      row +
      "             </tbody>" +
      "           </table>" +
      "       </div>" +
      '       <div class="line">' +
      '           <hr style="height: 100%;">' +
      "       </div>" +
      '       <div class="firma">' +
      '           <span class="rotate-90">'+separarNombre(dato.nombre)+'</span>' +
      "       </div>" +
      "</div>";
  });

  // if (datos.length % 2 !== 0) {
  //   registroEmpleado += `<div class="employee-section-no-data"></div>`;
  // }
  return template.replace("{{__DATA__REGISTROS}}", registroEmpleado);
};

function separarNombre(nombre) {
  return nombre.replace(/([A-Z])/g, " $1").trim(); // Elimina espacios al inicio/fin si los hubiera
}

const formatDate = (date) => {
  const fecha = new Date(date);

  return `${2025}-04-${30}`;
};

module.exports = {
  getReporteAsistencia,
};
