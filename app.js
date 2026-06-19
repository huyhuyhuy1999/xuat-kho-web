(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.XuatKhoApp = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  const DEFAULT_SAMPLE = [
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

  const UNIT_MAP = {
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

  function stripAccents(value) {
    return value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }

  function normalizeUnit(unitSuffix) {
    const raw = unitSuffix.trim().toLowerCase();
    return UNIT_MAP[raw] || UNIT_MAP[stripAccents(raw)] || "Cái";
  }

  function parseItem(itemText) {
    const text = itemText.trim();
    const standard = text.match(
      /^(?<name>.*?)\s*(?<qty>\d+)\s*(?<unit>[\p{L}]+)\s+(?:giá\s+)?(?<price>\d+)\s*k(?:\s+(?<note>.*))?$/iu,
    );

    if (standard?.groups) {
      const qty = Number.parseInt(standard.groups.qty, 10);
      const price = Number.parseInt(standard.groups.price, 10) * 1000;
      return {
        source: itemText,
        name: standard.groups.name.trim(),
        unit: normalizeUnit(standard.groups.unit),
        qty,
        price,
        total: qty * price,
        note: (standard.groups.note || "").trim(),
        parsed: true,
      };
    }

    const noQty = text.match(
      /^(?<name>.*?)\s+giá\s+(?<price>\d+)\s*k(?:\s+(?<note>.*))?$/iu,
    );

    if (noQty?.groups) {
      const price = Number.parseInt(noQty.groups.price, 10) * 1000;
      return {
        source: itemText,
        name: noQty.groups.name.trim(),
        unit: "Hộp",
        qty: 1,
        price,
        total: price,
        note: (noQty.groups.note || "").trim(),
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
    const blocks = content
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/g)
      .map((block) => block.trim())
      .filter(Boolean);

    const orders = [];
    const warnings = [];

    blocks.forEach((block, blockIndex) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 3) {
        warnings.push(`Đơn ${blockIndex + 1}: thiếu tên khách, địa chỉ hoặc hàng.`);
        return;
      }

      const items = lines.slice(2).map(parseItem);
      items.forEach((item, itemIndex) => {
        if (item.warning) {
          warnings.push(`Đơn ${blockIndex + 1}, dòng ${itemIndex + 1}: ${item.warning}`);
        }
      });

      orders.push({
        customer: lines[0],
        address: lines[1],
        items,
        total: items.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
      });
    });

    return { orders, warnings };
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  }

  function htmlEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toInputDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateParts(dateValue) {
    const [year, month, day] = dateValue.split("-");
    return {
      display: `${day}/${month}/${year}`,
      filename: `${day}${month}${year}`,
    };
  }

  function safeFilename(text) {
    return text
      .replace(/[<>:"/\\|?*]+/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  function workbookFilename(order, dateValue) {
    return `Phieu_${safeFilename(order.customer)}_${dateParts(dateValue).filename}.xlsx`;
  }

  function applyBorder(cell, style = "thin") {
    cell.border = {
      top: { style },
      left: { style },
      bottom: { style },
      right: { style },
    };
  }

  function styleCell(cell, options = {}) {
    if (options.alignment) {
      cell.alignment = options.alignment;
    }
    if (options.font) {
      cell.font = options.font;
    }
    if (options.fill) {
      const fillColor = options.fill.length === 6 ? `FF${options.fill}` : options.fill;
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

  function buildWorkbook(order, dateValue, sellerName) {
    if (!root.ExcelJS) {
      throw new Error("Chưa tải được ExcelJS. Hãy kiểm tra kết nối mạng rồi thử lại.");
    }

    const workbook = new root.ExcelJS.Workbook();
    workbook.creator = "Xuat Kho Web";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("PhieuXuatKho", {
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
    sheet.getCell("A3").value = `Ngày: ${dateParts(dateValue).display}`;
    sheet.getCell("A4").value = `Tên khách hàng: ${order.customer}`;
    sheet.getCell("A5").value = `Địa chỉ: ${order.address}`;
    sheet.getCell("A6").value = "SĐT: ";
    sheet.getCell("A7").value = `NV bán hàng: ${sellerName || "Phan Ngọc Cường"}`;

    styleCell(sheet.getCell("A2"), {
      font: { bold: true, size: 16 },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    styleCell(sheet.getCell("A3"), {
      alignment: { horizontal: "center", vertical: "middle" },
    });

    const headerRow = sheet.getRow(9);
    [
      "STT",
      "TÊN HÀNG",
      "Đ.V TÍNH",
      "SỐ LƯỢNG",
      "ĐƠN GIÁ",
      "THÀNH TIỀN",
      "GHI CHÚ",
    ].forEach((value, index) => {
      headerRow.getCell(index + 1).value = value;
    });
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      styleCell(cell, {
        font: { bold: true },
        fill: "D9EAD3",
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      });
      applyBorder(cell);
    });

    const startRow = 10;
    order.items.forEach((item, index) => {
      const row = sheet.getRow(startRow + index);
      [
        index + 1,
        item.name,
        item.unit,
        item.qty,
        item.price,
        item.total,
        item.note,
      ].forEach((value, colIndex) => {
        row.getCell(colIndex + 1).value = value;
      });
      row.eachCell((cell, colNumber) => {
        const isMoney = colNumber === 5 || colNumber === 6;
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
    });

    const totalRowNumber = startRow + order.items.length;
    sheet.mergeCells(`A${totalRowNumber}:E${totalRowNumber}`);
    sheet.getCell(`A${totalRowNumber}`).value = "CỘNG:";
    sheet.getCell(`F${totalRowNumber}`).value = order.total;
    styleCell(sheet.getCell(`A${totalRowNumber}`), {
      font: { bold: true },
      alignment: { horizontal: "right", vertical: "middle" },
    });
    styleCell(sheet.getCell(`F${totalRowNumber}`), {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "middle" },
      numFmt: "#,##0",
    });
    for (let col = 1; col <= 7; col += 1) {
      applyBorder(sheet.getCell(totalRowNumber, col));
    }

    const signatureRow = totalRowNumber + 2;
    const signaturePairs = [
      ["A", "B", "Người mua hàng"],
      ["C", "D", "Thủ kho"],
      ["E", "F", "Kế toán"],
    ];
    signaturePairs.forEach(([startCol, endCol, label]) => {
      sheet.mergeCells(`${startCol}${signatureRow}:${endCol}${signatureRow}`);
      sheet.mergeCells(`${startCol}${signatureRow + 1}:${endCol}${signatureRow + 1}`);
      sheet.getCell(`${startCol}${signatureRow}`).value = label;
      sheet.getCell(`${startCol}${signatureRow + 1}`).value = "(ký, họ tên)";
      styleCell(sheet.getCell(`${startCol}${signatureRow}`), {
        font: { bold: true, italic: true },
        alignment: { horizontal: "center" },
      });
      styleCell(sheet.getCell(`${startCol}${signatureRow + 1}`), {
        font: { italic: true },
        alignment: { horizontal: "center" },
      });
    });

    sheet.views = [{ state: "frozen", ySplit: 9 }];
    return workbook;
  }

  function renderPreview(parsed) {
    const preview = document.getElementById("preview");
    const orderCount = document.getElementById("orderCount");
    const grandTotal = document.getElementById("grandTotal");
    const parseState = document.getElementById("parseState");

    const { orders, warnings } = parsed;
    const total = orders.reduce((sum, order) => sum + order.total, 0);
    orderCount.textContent = `${orders.length} đơn`;
    grandTotal.textContent = money(total);
    parseState.textContent = orders.length ? "Đã parse dữ liệu" : "Chưa có dữ liệu";

    if (!orders.length) {
      preview.className = "preview-empty";
      preview.innerHTML = "Dán đơn hàng vào khung bên trái để xem bảng trước khi tải file.";
      return;
    }

    preview.className = "preview-scroll";
    const warningHtml = warnings.length
      ? `<ul class="warning-list">${warnings.map((warning) => `<li>${htmlEscape(warning)}</li>`).join("")}</ul>`
      : "";

    preview.innerHTML = `${warningHtml}${orders
      .map(
        (order) => `
          <article class="order-preview">
            <div class="order-header">
              <div>
                <strong>${htmlEscape(order.customer)}</strong>
                <span>${htmlEscape(order.address)}</span>
              </div>
              <div class="order-total">${money(order.total)}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên hàng</th>
                  <th>Đ.V</th>
                  <th class="numeric">SL</th>
                  <th class="numeric">Đơn giá</th>
                  <th class="numeric">Thành tiền</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                ${order.items
                  .map(
                    (item, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${htmlEscape(item.name)}</td>
                        <td>${htmlEscape(item.unit)}</td>
                        <td class="numeric">${htmlEscape(item.qty)}</td>
                        <td class="numeric">${item.price === "" ? "" : money(item.price)}</td>
                        <td class="numeric">${money(item.total)}</td>
                        <td>${htmlEscape(item.note)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </article>
        `,
      )
      .join("")}`;
  }

  async function saveOrders(parsed, dateValue, sellerName) {
    const { orders } = parsed;
    if (!orders.length) {
      throw new Error("Chưa có đơn hợp lệ để tạo file.");
    }

    if (orders.length === 1) {
      const workbook = buildWorkbook(orders[0], dateValue, sellerName);
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        workbookFilename(orders[0], dateValue),
      );
      return;
    }

    if (!root.JSZip) {
      throw new Error("Chưa tải được JSZip. Hãy kiểm tra kết nối mạng rồi thử lại.");
    }

    const zip = new root.JSZip();
    for (const order of orders) {
      const workbook = buildWorkbook(order, dateValue, sellerName);
      const buffer = await workbook.xlsx.writeBuffer();
      zip.file(workbookFilename(order, dateValue), buffer);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `Phieu_Xuat_Kho_${dateParts(dateValue).filename}.zip`);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function init() {
    const orderInput = document.getElementById("orderInput");
    const dateInput = document.getElementById("dateInput");
    const sellerInput = document.getElementById("sellerInput");
    const sampleButton = document.getElementById("sampleButton");
    const clearButton = document.getElementById("clearButton");
    const downloadButton = document.getElementById("downloadButton");
    const statusMessage = document.getElementById("statusMessage");

    dateInput.value = toInputDate();

    let parsed = parseOrders(orderInput.value);
    renderPreview(parsed);

    function refresh() {
      parsed = parseOrders(orderInput.value);
      renderPreview(parsed);
      statusMessage.textContent = "";
      statusMessage.className = "status";
    }

    orderInput.addEventListener("input", refresh);
    sampleButton.addEventListener("click", () => {
      orderInput.value = DEFAULT_SAMPLE;
      refresh();
      orderInput.focus();
    });
    clearButton.addEventListener("click", () => {
      orderInput.value = "";
      refresh();
      orderInput.focus();
    });
    downloadButton.addEventListener("click", async () => {
      statusMessage.textContent = "Đang tạo file...";
      statusMessage.className = "status";
      downloadButton.disabled = true;
      try {
        await saveOrders(parsed, dateInput.value, sellerInput.value.trim());
        statusMessage.textContent =
          parsed.orders.length === 1 ? "Đã tạo file XLSX." : "Đã tạo file ZIP.";
      } catch (error) {
        statusMessage.textContent = error.message;
        statusMessage.className = "status error";
      } finally {
        downloadButton.disabled = false;
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  return {
    DEFAULT_SAMPLE,
    parseItem,
    parseOrders,
    normalizeUnit,
    dateParts,
    safeFilename,
    workbookFilename,
    buildWorkbook,
  };
});
