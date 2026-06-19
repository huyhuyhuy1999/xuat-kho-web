(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.XuatKhoApp = api;
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this, function (root) {
  var DEFAULT_SELLER = "Phan Ngọc Cường";
  var DEFAULT_SAMPLE = [
    "Nhà thuốc quang trung",
    "Gialai",
    "Glutathion 500mg 10h giá 450k km 8h",
    "",
    "Thuốc tây mạnh khang",
    "Đức cơ",
    "Men ống 10h 157k km 8h",
    "Ăn ngon trẻ em 10h giá 153k km 8h",
    "",
    "Thuốc tây hồng hạnh",
    "Kon tum",
    "Đông trùng hạ thảo ( vĩ 50v) 5h giá 225k km 4h",
  ].join("\n");

  var UNIT_MAP = {
    h: "Hộp",
    hop: "Hộp",
    "hộp": "Hộp",
    l: "Lọ",
    lo: "Lọ",
    "lọ": "Lọ",
    v: "Viên",
    vien: "Viên",
    "viên": "Viên",
    loc: "Lốc",
    "lốc": "Lốc",
  };

  var ACCENTED = {
    à: "a",
    á: "a",
    ạ: "a",
    ả: "a",
    ã: "a",
    â: "a",
    ầ: "a",
    ấ: "a",
    ậ: "a",
    ẩ: "a",
    ẫ: "a",
    ă: "a",
    ằ: "a",
    ắ: "a",
    ặ: "a",
    ẳ: "a",
    ẵ: "a",
    è: "e",
    é: "e",
    ẹ: "e",
    ẻ: "e",
    ẽ: "e",
    ê: "e",
    ề: "e",
    ế: "e",
    ệ: "e",
    ể: "e",
    ễ: "e",
    ì: "i",
    í: "i",
    ị: "i",
    ỉ: "i",
    ĩ: "i",
    ò: "o",
    ó: "o",
    ọ: "o",
    ỏ: "o",
    õ: "o",
    ô: "o",
    ồ: "o",
    ố: "o",
    ộ: "o",
    ổ: "o",
    ỗ: "o",
    ơ: "o",
    ờ: "o",
    ớ: "o",
    ợ: "o",
    ở: "o",
    ỡ: "o",
    ù: "u",
    ú: "u",
    ụ: "u",
    ủ: "u",
    ũ: "u",
    ư: "u",
    ừ: "u",
    ứ: "u",
    ự: "u",
    ử: "u",
    ữ: "u",
    ỳ: "y",
    ý: "y",
    ỵ: "y",
    ỷ: "y",
    ỹ: "y",
    đ: "d",
  };

  function stripAccents(value) {
    var text = String(value || "").toLowerCase();
    if (text.normalize) {
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return text.replace(/[^\u0000-\u007E]/g, function (char) {
      return ACCENTED[char] || char;
    });
  }

  function normalizeUnit(unitSuffix) {
    var raw = String(unitSuffix || "").trim().toLowerCase();
    return UNIT_MAP[raw] || UNIT_MAP[stripAccents(raw)] || "Cái";
  }

  function parseItem(itemText) {
    var text = String(itemText || "").trim();
    var standard = text.match(
      /^(.*?)\s*(\d+)\s*([A-Za-z\u00C0-\u1EF9\u0110\u0111]+)\s+(?:gi(?:a|\u00E1)\s+)?(\d+)\s*k(?:\s+(.*))?$/i
    );

    if (standard) {
      var qty = parseInt(standard[2], 10);
      var price = parseInt(standard[4], 10) * 1000;
      return {
        source: itemText,
        name: standard[1].trim(),
        unit: normalizeUnit(standard[3]),
        qty: qty,
        price: price,
        total: qty * price,
        note: (standard[5] || "").trim(),
        parsed: true,
      };
    }

    var noQty = text.match(/^(.*?)\s+gi(?:a|\u00E1)\s+(\d+)\s*k(?:\s+(.*))?$/i);
    if (noQty) {
      var fallbackPrice = parseInt(noQty[2], 10) * 1000;
      return {
        source: itemText,
        name: noQty[1].trim(),
        unit: "Hộp",
        qty: 1,
        price: fallbackPrice,
        total: fallbackPrice,
        note: (noQty[3] || "").trim(),
        parsed: true,
        warning: "Không thấy số lượng, mặc định 1 Hộp.",
      };
    }

    return {
      source: itemText,
      name: itemText,
      unit: "",
      qty: "",
      price: "",
      total: 0,
      note: "",
      parsed: false,
      warning: "Không parse được dòng hàng.",
    };
  }

  function parseOrders(content) {
    var blocks = String(content || "")
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/g);
    var orders = [];
    var warnings = [];

    for (var blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      var block = blocks[blockIndex].trim();
      if (!block) {
        continue;
      }

      var rawLines = block.split("\n");
      var lines = [];
      for (var lineIndex = 0; lineIndex < rawLines.length; lineIndex += 1) {
        var line = rawLines[lineIndex].trim();
        if (line) {
          lines.push(line);
        }
      }

      if (lines.length < 3) {
        warnings.push("Đơn " + (blockIndex + 1) + ": thiếu tên khách, địa chỉ hoặc hàng.");
        continue;
      }

      var items = [];
      var total = 0;
      for (var itemIndex = 2; itemIndex < lines.length; itemIndex += 1) {
        var item = parseItem(lines[itemIndex]);
        items.push(item);
        total += Number(item.total) || 0;
        if (item.warning) {
          warnings.push(
            "Đơn " + (blockIndex + 1) + ", dòng " + (itemIndex - 1) + ": " + item.warning
          );
        }
      }

      orders.push({
        customer: lines[0],
        address: lines[1],
        items: items,
        total: total,
      });
    }

    return { orders: orders, warnings: warnings };
  }

  function money(value) {
    var number = String(Math.round(Number(value || 0)));
    var result = "";
    while (number.length > 3) {
      result = "." + number.slice(-3) + result;
      number = number.slice(0, -3);
    }
    return number + result + "đ";
  }

  function htmlEscape(value) {
    return String(value === null || typeof value === "undefined" ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function pad2(value) {
    value = String(value);
    return value.length < 2 ? "0" + value : value;
  }

  function toInputDate(date) {
    date = date || new Date();
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function dateParts(dateValue) {
    var parts = String(dateValue || toInputDate()).split("-");
    return {
      display: parts[2] + "/" + parts[1] + "/" + parts[0],
      filename: parts[2] + parts[1] + parts[0],
    };
  }

  function safeFilename(text) {
    return String(text || "")
      .replace(/[<>:"/\\|?*]+/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  function workbookFilename(order, dateValue) {
    return "Phieu_" + safeFilename(order.customer) + "_" + dateParts(dateValue).filename + ".xlsx";
  }

  function applyBorder(cell, style) {
    style = style || "thin";
    cell.border = {
      top: { style: style },
      left: { style: style },
      bottom: { style: style },
      right: { style: style },
    };
  }

  function styleCell(cell, options) {
    options = options || {};
    if (options.alignment) {
      cell.alignment = options.alignment;
    }
    if (options.font) {
      cell.font = options.font;
    }
    if (options.fill) {
      var fillColor = options.fill.length === 6 ? "FF" + options.fill : options.fill;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
    }
    if (options.numFmt) {
      cell.numFmt = options.numFmt;
    }
  }

  function writeRow(row, values) {
    for (var index = 0; index < values.length; index += 1) {
      row.getCell(index + 1).value = values[index];
    }
  }

  function buildWorkbook(order, dateValue, sellerName) {
    if (!root.ExcelJS) {
      throw new Error("Chưa tải được ExcelJS. Hãy kiểm tra kết nối mạng rồi thử lại.");
    }

    var workbook = new root.ExcelJS.Workbook();
    workbook.creator = "Xuat Kho Web";
    workbook.created = new Date();

    var sheet = workbook.addWorksheet("PhieuXuatKho", {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
    });

    sheet.columns = [
      { key: "stt", width: 7 },
      { key: "name", width: 32 },
      { key: "unit", width: 13 },
      { key: "qty", width: 14 },
      { key: "price", width: 15 },
      { key: "total", width: 16 },
      { key: "note", width: 18 },
    ];

    sheet.mergeCells("A2:G2");
    sheet.mergeCells("A3:G3");
    sheet.getCell("A2").value = "PHIẾU XUẤT KHO BÁN HÀNG";
    sheet.getCell("A3").value = "Ngày: " + dateParts(dateValue).display;
    sheet.getCell("A4").value = "Tên khách hàng: " + order.customer;
    sheet.getCell("A5").value = "Địa chỉ: " + order.address;
    sheet.getCell("A6").value = "SĐT: ";
    sheet.getCell("A7").value = "NV bán hàng: " + (sellerName || DEFAULT_SELLER);

    styleCell(sheet.getCell("A2"), {
      font: { bold: true, size: 16 },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    styleCell(sheet.getCell("A3"), {
      alignment: { horizontal: "center", vertical: "middle" },
    });

    var headerRow = sheet.getRow(9);
    writeRow(headerRow, [
      "STT",
      "TÊN HÀNG",
      "Đ.V TÍNH",
      "SỐ LƯỢNG",
      "ĐƠN GIÁ",
      "THÀNH TIỀN",
      "GHI CHÚ",
    ]);
    headerRow.height = 22;
    headerRow.eachCell(function (cell) {
      styleCell(cell, {
        font: { bold: true },
        fill: "D9EAD3",
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      });
      applyBorder(cell);
    });

    var startRow = 10;
    for (var itemIndex = 0; itemIndex < order.items.length; itemIndex += 1) {
      var item = order.items[itemIndex];
      var row = sheet.getRow(startRow + itemIndex);
      writeRow(row, [
        itemIndex + 1,
        item.name,
        item.unit,
        item.qty,
        item.price,
        item.total,
        item.note,
      ]);
      row.eachCell(function (cell, colNumber) {
        var isMoney = colNumber === 5 || colNumber === 6;
        styleCell(cell, {
          alignment: {
            horizontal: colNumber === 2 ? "left" : "center",
            vertical: "middle",
            wrapText: true,
          },
          numFmt: isMoney ? "#,##0" : undefined,
        });
        applyBorder(cell);
      });
    }

    var totalRowNumber = startRow + order.items.length;
    sheet.mergeCells("A" + totalRowNumber + ":E" + totalRowNumber);
    sheet.getCell("A" + totalRowNumber).value = "CỘNG:";
    sheet.getCell("F" + totalRowNumber).value = order.total;
    styleCell(sheet.getCell("A" + totalRowNumber), {
      font: { bold: true },
      alignment: { horizontal: "right", vertical: "middle" },
    });
    styleCell(sheet.getCell("F" + totalRowNumber), {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "middle" },
      numFmt: "#,##0",
    });
    for (var col = 1; col <= 7; col += 1) {
      applyBorder(sheet.getCell(totalRowNumber, col));
    }

    var signatureRow = totalRowNumber + 2;
    var signaturePairs = [
      ["A", "B", "Người mua hàng"],
      ["C", "D", "Thủ kho"],
      ["E", "F", "Kế toán"],
    ];
    for (var pairIndex = 0; pairIndex < signaturePairs.length; pairIndex += 1) {
      var pair = signaturePairs[pairIndex];
      sheet.mergeCells(pair[0] + signatureRow + ":" + pair[1] + signatureRow);
      sheet.mergeCells(pair[0] + (signatureRow + 1) + ":" + pair[1] + (signatureRow + 1));
      sheet.getCell(pair[0] + signatureRow).value = pair[2];
      sheet.getCell(pair[0] + (signatureRow + 1)).value = "(ký, họ tên)";
      styleCell(sheet.getCell(pair[0] + signatureRow), {
        font: { bold: true, italic: true },
        alignment: { horizontal: "center" },
      });
      styleCell(sheet.getCell(pair[0] + (signatureRow + 1)), {
        font: { italic: true },
        alignment: { horizontal: "center" },
      });
    }

    sheet.views = [{ state: "frozen", ySplit: 9 }];
    return workbook;
  }

  function renderPreview(parsed) {
    var preview = document.getElementById("preview");
    var orderCount = document.getElementById("orderCount");
    var grandTotal = document.getElementById("grandTotal");
    var parseState = document.getElementById("parseState");
    var orders = parsed.orders;
    var warnings = parsed.warnings;
    var total = 0;
    var html = "";

    for (var orderIndex = 0; orderIndex < orders.length; orderIndex += 1) {
      total += orders[orderIndex].total;
    }

    orderCount.textContent = orders.length + " đơn";
    grandTotal.textContent = money(total);
    parseState.textContent = orders.length ? "Đã parse dữ liệu" : "Chưa có dữ liệu";

    if (!orders.length) {
      preview.className = "preview-empty";
      preview.innerHTML = "Dán đơn hàng vào khung bên trái để xem bảng trước khi tải file.";
      return;
    }

    preview.className = "preview-scroll";
    if (warnings.length) {
      html += '<ul class="warning-list">';
      for (var warningIndex = 0; warningIndex < warnings.length; warningIndex += 1) {
        html += "<li>" + htmlEscape(warnings[warningIndex]) + "</li>";
      }
      html += "</ul>";
    }

    for (var i = 0; i < orders.length; i += 1) {
      var order = orders[i];
      html += '<article class="order-preview">';
      html += '<div class="order-header"><div>';
      html += "<strong>" + htmlEscape(order.customer) + "</strong>";
      html += "<span>" + htmlEscape(order.address) + "</span>";
      html += '</div><div class="order-total">' + money(order.total) + "</div></div>";
      html += "<table><thead><tr>";
      html += "<th>STT</th><th>Tên hàng</th><th>Đ.V</th>";
      html += '<th class="numeric">SL</th><th class="numeric">Đơn giá</th>';
      html += '<th class="numeric">Thành tiền</th><th>Ghi chú</th>';
      html += "</tr></thead><tbody>";

      for (var j = 0; j < order.items.length; j += 1) {
        var item = order.items[j];
        html += "<tr>";
        html += "<td>" + (j + 1) + "</td>";
        html += "<td>" + htmlEscape(item.name) + "</td>";
        html += "<td>" + htmlEscape(item.unit) + "</td>";
        html += '<td class="numeric">' + htmlEscape(item.qty) + "</td>";
        html += '<td class="numeric">' + (item.price === "" ? "" : money(item.price)) + "</td>";
        html += '<td class="numeric">' + money(item.total) + "</td>";
        html += "<td>" + htmlEscape(item.note) + "</td>";
        html += "</tr>";
      }

      html += "</tbody></table></article>";
    }

    preview.innerHTML = html;
  }

  function saveOrders(parsed, dateValue, sellerName) {
    var orders = parsed.orders;
    if (!orders.length) {
      return Promise.reject(new Error("Chưa có đơn hợp lệ để tạo file."));
    }

    if (orders.length === 1) {
      var workbook = buildWorkbook(orders[0], dateValue, sellerName);
      return workbook.xlsx.writeBuffer().then(function (buffer) {
        downloadBlob(
          new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          workbookFilename(orders[0], dateValue)
        );
      });
    }

    if (!root.JSZip) {
      return Promise.reject(new Error("Chưa tải được JSZip. Hãy kiểm tra kết nối mạng rồi thử lại."));
    }

    var zip = new root.JSZip();
    var chain = Promise.resolve();
    for (var orderIndex = 0; orderIndex < orders.length; orderIndex += 1) {
      (function (order) {
        chain = chain.then(function () {
          var workbook = buildWorkbook(order, dateValue, sellerName);
          return workbook.xlsx.writeBuffer().then(function (buffer) {
            zip.file(workbookFilename(order, dateValue), buffer);
          });
        });
      })(orders[orderIndex]);
    }

    return chain.then(function () {
      return zip.generateAsync({ type: "blob" });
    }).then(function (blob) {
      downloadBlob(blob, "Phieu_Xuat_Kho_" + dateParts(dateValue).filename + ".zip");
    });
  }

  function downloadBlob(blob, filename) {
    if (root.saveAs) {
      root.saveAs(blob, filename);
      return;
    }

    var urlApi = root.URL || root.webkitURL;
    if (!urlApi || !urlApi.createObjectURL) {
      throw new Error("Trình duyệt này chưa hỗ trợ tải file Blob.");
    }

    var url = urlApi.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);

    if (typeof anchor.click === "function") {
      anchor.click();
    } else {
      root.open(url, "_blank");
    }

    document.body.removeChild(anchor);
    setTimeout(function () {
      urlApi.revokeObjectURL(url);
    }, 1000);
  }

  function init() {
    var orderInput = document.getElementById("orderInput");
    var dateInput = document.getElementById("dateInput");
    var sellerInput = document.getElementById("sellerInput");
    var sampleButton = document.getElementById("sampleButton");
    var clearButton = document.getElementById("clearButton");
    var downloadButton = document.getElementById("downloadButton");
    var statusMessage = document.getElementById("statusMessage");

    dateInput.value = toInputDate();
    var parsed = parseOrders(orderInput.value);
    renderPreview(parsed);

    function refresh() {
      parsed = parseOrders(orderInput.value);
      renderPreview(parsed);
      statusMessage.textContent = "";
      statusMessage.className = "status";
    }

    orderInput.addEventListener("input", refresh);
    sampleButton.addEventListener("click", function () {
      orderInput.value = DEFAULT_SAMPLE;
      refresh();
      orderInput.focus();
    });
    clearButton.addEventListener("click", function () {
      orderInput.value = "";
      refresh();
      orderInput.focus();
    });
    downloadButton.addEventListener("click", function () {
      statusMessage.textContent = "Đang tạo file...";
      statusMessage.className = "status";
      downloadButton.disabled = true;
      saveOrders(parsed, dateInput.value, sellerInput.value.trim())
        .then(function () {
          statusMessage.textContent =
            parsed.orders.length === 1 ? "Đã tạo file XLSX." : "Đã tạo file ZIP.";
        })
        .catch(function (error) {
          statusMessage.textContent = error.message;
          statusMessage.className = "status error";
        })
        .then(function () {
          downloadButton.disabled = false;
        });
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  return {
    DEFAULT_SAMPLE: DEFAULT_SAMPLE,
    parseItem: parseItem,
    parseOrders: parseOrders,
    normalizeUnit: normalizeUnit,
    dateParts: dateParts,
    safeFilename: safeFilename,
    workbookFilename: workbookFilename,
    buildWorkbook: buildWorkbook,
  };
});
