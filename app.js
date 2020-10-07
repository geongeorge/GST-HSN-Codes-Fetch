/** @format */

import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";

const GST_URL = "https://cbic-gst.gov.in/gst-goods-services-rates.html";
const GST_TABLE = "#goods_table";

async function writeFile(file, text) {
  const stream = fs.createWriteStream(file);
  return stream.write(text);
}

async function fetchPageHTML() {
  const html = await axios.get(GST_URL);
  return cheerio.load(html.data);
}

async function main() {
  const $ = await fetchPageHTML();

  saveTableHtml($);
  saveTableJson($);
}

main();

function saveTableHtml($) {
  const table = $(GST_TABLE);
  const outerHtml = cheerio.html(table);
  writeFile("./output/table.html", outerHtml);
}

function saveTableJson($) {
  const trs = $(`${GST_TABLE} tbody tr`);
  const rows = [];
  trs.each(function (i, elem) {
    const tds = $(this).find("td");
    const obj = {};
    tds.each(function (j, el) {
      let key = "";
      switch (j) {
        case 1: //HSN Code
          key = "hsn";
          break;
        case 2: //Description
          key = "description";
          break;
        case 3:
          key = "cgst";
          break;
        case 4:
          key = "SGST";
          break;
        case 5:
          key = "IGST";
          break;
        default:
          break;
      }
      if (key) {
        obj[key] = $(this).html();
      }
      rows.push(obj);
    });
  });

  const json = JSON.stringify(rows, null, 2);
  writeFile("./output/hsn.json", json);
}
