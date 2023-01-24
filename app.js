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
        case 1:
          key = "s no.";
        case 2: //HSN Code
          key = "hsn";
          break;
        case 3: //Description
          key = "description";
          break;
        case 4:
          key = "CGST";
          break;
        case 5:
          key = "SGST";
          break;
        case 6:
          key = "IGST";
          break;
        default:
          break;
      }
      if (key) {
        obj[key] = $(this)
          .html()
          .replace(/(<([^>]+)>)/gi, "")
          .replaceAll("\n", "")
          .replaceAll("&nbsp;", "")
          .replace(/\s+/g, " ")
          .trim();
      }
      rows.push(obj);
    });
  });

  let moreCleanedData = [];

  rows.forEach((row, index) => {
    if (row?.hsn?.includes("or")) {
      let first = row.hsn.split(" or ")[0];
      let second = row.hsn.split(" or ")[1];
      moreCleanedData.push({
        hsn: first,
        description: row.description,
        CGST: row.CGST,
        SGST: row.SGST,
        IGST: row.IGST,
      });
      moreCleanedData.push({
        hsn: second,
        description: row.description,
        CGST: row.CGST,
        SGST: row.SGST,
        IGST: row.IGST,
      });
    }
    // Handle range b/w to HSNs
    else if (row?.hsn?.includes("to")) {
      let startHSN = parseInt(row.hsn.split(" to ")[0]);
      let endHSN = parseInt(row.hsn.split(" to ")[1]);
      do {
        startHSN++;
        moreCleanedData.push({
          hsn: startHSN.toString(),
          description: row.description,
          CGST: row.CGST,
          SGST: row.SGST,
          IGST: row.IGST,
        });
      } while (startHSN < endHSN);
    }
    // handle commas
    else if (row?.hsn?.includes(",")) {
      row.hsn.split(",").forEach((hsn) => {
        moreCleanedData.push({
          hsn: hsn.toString(),
          description: row.description,
          CGST: row.CGST,
          SGST: row.SGST,
          IGST: row.IGST,
        });
      });
    }

    // push the rest
    else if (
      row.hsn &&
      row.CGST &&
      row.SGST &&
      row.IGST &&
      !row.description.includes("[Omitted]")
    ) {
      if (row.hsn.includes("Any Chapter") || row.hsn === "-") {
        return;
      }
      if (row.CGST) {
        moreCleanedData.push({
          hsn: row.hsn,
          description: row.description,
          CGST: row.CGST,
          SGST: row.SGST,
          IGST: row.IGST,
        });
      }
    }
  });
  const arrUniq = [...new Map(moreCleanedData.map((v) => [v.hsn, v])).values()];
  const json = JSON.stringify(arrUniq, null, 2);
  let date_ob = Date.now();
  writeFile(`./output/hsn-${Math.floor(date_ob / 1000)}.json`, json);
}
