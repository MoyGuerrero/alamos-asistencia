const { response } = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const exceljs = require("exceljs");

const ResponseHandler = require("../model/response");
const dbConnection = require("../db/db");

const getReporteAsistencia = async (req, res = response) => {
  try {
    let { desde, hasta } = req.params;
    let isPDF = true;
    const dias_festivos = [
      `${new Date().getFullYear()}-01-01`,
      `${new Date().getFullYear()}-02-05`, // se recorre al primer lunes
      `${new Date().getFullYear()}-03-21`, // se recorre al primer lunes de la semana
      `${new Date().getFullYear()}-04-17`,
      `${new Date().getFullYear()}-04-18`,
      `${new Date().getFullYear()}-05-01`, // se queda en el dia que cae
      `${new Date().getFullYear()}-09-15`, // se recorre al primer lunes
      `${new Date().getFullYear()}-11-17`, // se recorre al primer lunes
      `${new Date().getFullYear()}-12-12`, // 
      `${new Date().getFullYear()}-12-24`, //
      `${new Date().getFullYear()}-12-25`, 
      `${new Date().getFullYear()}-12-31`,
    ]

    const pool = await dbConnection();

//     const { recordset } = await pool
//       .request()
//       .input("desde", desde)
//       .input("hasta", hasta).query(`
//        SET LANGUAGE Spanish;
//         WITH Fechas AS (
//                                                           SELECT @desde AS Fecha
//                                                           UNION ALL
//                                                           SELECT DATEADD(DAY, 1, Fecha)
//                                                           FROM Fechas
//                                                           WHERE Fecha < @hasta
//                                                       ),
//                                         Nombres AS (
//                                           SELECT DISTINCT Nombre, Device_Ip FROM Marcajes
//                                       ),
// EmpleadoFechas AS (
//     SELECT f.Fecha, n.Nombre, n.Device_Ip
//     FROM Fechas f
//     CROSS JOIN Nombres n
// )
// SELECT 
//     ef.Nombre AS NOMBRE,
//     ef.Fecha AS FECHA,
    
//     COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Entrada' THEN CONVERT(VARCHAR(8), m.Hora, 108) END), 'Sin registro') AS ENTRADA,
//     COALESCE(MIN(CASE WHEN m.Tipo_Evento = 'Comida' THEN CONVERT(VARCHAR(8), m.Hora, 108) END), 'Sin registro') AS SALIDA_COMIDA,
//     COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Comida' THEN CONVERT(VARCHAR(8), m.Hora, 108) END), 'Sin registro') AS ENTRADA_COMIDA,
//     COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Salida' THEN CONVERT(VARCHAR(8), m.Hora, 108) END), 'Sin registro') AS SALIDA,
//     COALESCE(MAX(CASE WHEN m.Tipo_Evento = 'Sin evento' THEN CONVERT(VARCHAR(8), m.Hora, 108) END), 'Sin registro') AS EXTRA,

//     CASE 
//         WHEN ef.Device_Ip LIKE '%11.200' THEN 'Cuauhtemoc, Chihuahua'
//         WHEN ef.Device_Ip LIKE '%12.201' THEN 'Nuevo Casas Grandes, Chihuahua'
//         ELSE 'Sucursal desconocida'
//     END AS SUCURSAL,

//     CASE 
//         WHEN ef.Device_Ip LIKE '%11.200' THEN 'Km 14 Carretera Álvaro Obregón #1417 Plaza Ontario Local 11'
//         WHEN ef.Device_Ip LIKE '%12.201' THEN 'ÁLVARO OBREGON #512, coL. CENTRO. c.p 31700'
//         ELSE 'Dirección desconocida'
//     END AS DIRECCION

// FROM EmpleadoFechas ef
// LEFT JOIN Marcajes m 
//     ON m.Nombre = ef.Nombre 
//    AND m.Fecha = ef.Fecha 
//    AND m.Device_Ip = ef.Device_Ip

// WHERE ef.Nombre NOT IN ('OscarMerinoCortes', 'Admin', 'MoisesGuerreroVazquez')

// GROUP BY ef.Nombre, ef.Fecha, ef.Device_Ip
// ORDER BY ef.Device_Ip, ef.Nombre

// OPTION (MAXRECURSION 1000);`);

    const { recordset } = await pool
      .request()
      .input("desde", desde)
      .input("hasta", hasta)
      .execute("sp_asistencias");

    const formatoExcel = [];

    recordset.forEach((element) => {
      let persona = formatoExcel.find((p) => p.nombre === element.NOMBRE);
      if (!persona) {
        persona = {
          nombre: element.NOMBRE,
          sucursal: element.SUCURSAL,
          direccion: element.DIRECCION,
          asistencias: [],
        };
        formatoExcel.push(persona);
      }

      persona.asistencias.push({
        fecha: element.FECHA,
        dia: element.FECHA_DIA,
        entrada: dias_festivos.includes(element.FECHA.toISOString().split("T")[0]) ? 'Festivo': element.ENTRADA,
        salida_comida: dias_festivos.includes(element.FECHA.toISOString().split("T")[0]) ? 'Festivo':  element.SALIDA_COMIDA,
        entrada_comida: dias_festivos.includes(element.FECHA.toISOString().split("T")[0]) ? 'Festivo':  element.ENTRADA_COMIDA,
        salida:dias_festivos.includes(element.FECHA.toISOString().split("T")[0]) ? 'Festivo':  element.SALIDA,
        extra:dias_festivos.includes(element.FECHA.toISOString().split("T")[0]) ? 'Festivo':  element.EXTRA,
      });
    });
    if(isPDF){    
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
    const fileNamePDF = `reporte-asistencia-${Date.now()}.pdf`;
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
  }
    const libroExcel = new exceljs.Workbook();

    let inicioColumnaNombre = 9;
    let inicioColumnaNombre2 = 9;
    const pathFile = path.resolve( __dirname, "../report/reporte_asistencia_v2.xlsx" );

    await libroExcel.xlsx.readFile(pathFile);

    const sheet = libroExcel.getWorksheet("Hoja1");
    const sheet2 = libroExcel.getWorksheet("Hoja2");

    let message = `Reporte generado a las fechas ${ desde.toISOString().split("T")[0] } - ${hasta.toISOString().split("T")[0]}`;

    sheet.getCell("F4").value = message;
    sheet2.getCell("F4").value = message;

    for (let i = 0; i < formatoExcel.length; i++) {
      // Combinar celdas para el nombre

      if (formatoExcel[i].sucursal === "Cuauhtemoc, Chihuahua") {
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
          sheet.getCell(`F${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].dia;
          sheet.getCell(`G${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].fecha;
          sheet.getCell(`H${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].entrada;
          sheet.getCell(`I${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].salida_comida;
          sheet.getCell(`J${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].entrada_comida;
          sheet.getCell(`K${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].salida;
          sheet.getCell(`L${inicioColumnaNombre}`).value = formatoExcel[i].asistencias[j].extra;
          inicioColumnaNombre++;
        }
  
        // Opcional: espacio entre empleados
        // inicioColumnaNombre++;
        // sheet.name = "Cuauhtemoc,Chihuahua";
        sheet.name = formatoExcel[i].sucursal;
      }
      if (formatoExcel[i].sucursal === "Nuevo Casas Grandes, Chihuahua") {
        sheet2.mergeCells(`B${inicioColumnaNombre2}:E${inicioColumnaNombre2}`);
  
        // Formatear celda del nombre
        const nombreCell = sheet2.getCell(`B${inicioColumnaNombre2}`);
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
  
        // inicioColumnaNombre2++;
  
        // Escribir asistencias
        for (let j = 0; j < formatoExcel[i].asistencias.length; j++) {
          sheet2.getCell(`F${inicioColumnaNombre2}`).value = formatoExcel[i].asistencias[j].dia;
          sheet2.getCell(`G${inicioColumnaNombre2}`).value = formatoExcel[i].asistencias[j].fecha;
          sheet2.getCell(`H${inicioColumnaNombre2}`).value = formatoExcel[i].asistencias[j].entrada;
          sheet2.getCell(`I${inicioColumnaNombre2}`).value = formatoExcel[i].asistencias[j].salida_comida;
          sheet2.getCell(`J${inicioColumnaNombre2}`).value = formatoExcel[i].asistencias[j].entrada_comida;
          sheet2.getCell(`K${inicioColumnaNombre2}`).value = formatoExcel[i].asistencias[j].salida;
          sheet2.getCell(`L${inicioColumnaNombre2}`).value = formatoExcel[i].asistencias[j].extra;
          inicioColumnaNombre2++;
        }
  
        // Opcional: espacio entre empleados
        // inicioColumnaNombre2++;
        // sheet2.name = "Cuauhtemoc,Chihuahua";
        sheet2.name = formatoExcel[i].sucursal;
      }
    }


    const now = new Date();
    const fechaFormateada = now.toISOString().split("T")[0];
    const horaFormateada = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const fileName = `Reporte_Asistencia_${fechaFormateada}_${horaFormateada}.xlsx`;

    const buffer = await libroExcel.xlsx.writeBuffer();
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" );
    res.send(buffer);
    // ResponseHandler.respuesta(res, "Sucess", 200, formatoExcel);
  } catch (error) {
    console.log(error);
    
    ResponseHandler.respuesta(res, error.message, 500, []);
  }
};

const generarPDF = async (datos, desde, hasta) => {
  const pathFile = path.join(__dirname, "../template/index.html");
  const template = await fs.readFileSync(pathFile, "utf8");

  let registroEmpleado = "";

  datos.forEach((dato) => {
    let row = "";

    for (let i = 0; i < dato.asistencias.length; i++) {
      row += `<tr>
                 <td>${dato.asistencias[i].dia}</td>
                 <td>${dato.asistencias[i].fecha.toISOString().split("T")[0]}</td>
                 <td>${dato.asistencias[i].entrada}</td>
                 <td>${dato.asistencias[i].salida_comida}</td>
                 <td>${dato.asistencias[i].entrada_comida}</td>
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
    /*registroEmpleado +=
      '<div class="cuadro" style="grid-row: 1 / 3;">' +
      '     <div class="logo" style="background-image: url(\'data:image/jpeg;base64,' +
      logoBase64 +
      "');background-position: center;background-size: cover;background-repeat: no-repeat;\"></div>" +
      '     <div class="texto1">' +
      '         <div class="rotate-90">' +
      '           <label class="title">Fechas:</label>' +
      '           <span class="subtitle">' +
      desde.toISOString().split("T")[0] +
      " al " +
      hasta.toISOString().split("T")[0] +
      "</span>" +
      "         </div>" +
      '         <div class="rotate-90">' +
      '           <label class="title">Nombre</label>' +
      '           <span class="subtitle">' +
      separarNombre(dato.nombre) +
      "</span>" +
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
      "         </div>" +
      "      </div>" +
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
      '           <span class="rotate-90">' +
      separarNombre(dato.nombre) +
      "</span>" +
      "       </div>" +
      "</div>";*/
    
    registroEmpleado += `
            <div class="tarjeta">
            <div class="logo">
                <img src="data:image/jpeg;base64,${logoBase64}" alt="Logo" width="150">
            </div>
            <div class="texto">
                <label>Nombre: <span>${separarNombre(dato.nombre)}</span></label>
                <label>Fechas: <span>${ desde.toISOString().split("T")[0] } al ${ hasta.toISOString().split("T")[0] }</span></label>
            </div>

            <div class="texto">
                <label>Sucursal: <span>${dato.sucursal}</span></label>
                <label
                  >Direccion:
                  <span>${dato.direccion}</span></label
                >
              </div>

            <table class="table">
                <thead>
                    <tr>
                        <th>Dia</th>
                        <th>Fecha</th>
                        <th>Entrada</th>
                        <th>Salida Comida</th>
                        <th>Entrada Comida</th>
                        <th>Salida</th>
                        <th>Extra</th>
                    </tr>
                </thead>
                <tbody>
                    ${row}
                </tbody>
            </table>


            <footer style="display: flex; justify-content: center; align-items: center; margin-top: 50px;">
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <hr style="width: 250px;">
                    <span style="text-align: center;">${separarNombre(dato.nombre)}</span>
                </div>
            </footer>
        </div>
    `;
  });

  // if (datos.length % 2 !== 0) {
  //   registroEmpleado += `<div class="employee-section-no-data"></div>`;
  // }
  return template.replace("{{__DATA__REGISTROS}}", registroEmpleado);
};

function separarNombre(nombre) {
  return nombre.replace(/([A-Z])/g, " $1").trim(); // Elimina espacios al inicio/fin si los hubiera
}

module.exports = {
  getReporteAsistencia,
};
