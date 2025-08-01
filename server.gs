// Google Apps Script Code

const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("工作表1"); // 請確認你的工作表名稱是否為 "工作表1"


function doGet(e) {
  try {
    const lastRow = sheet.getLastRow();
    // 如果只有標題列，回傳空陣列
    if (lastRow < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // 從第二列開始讀取，讀到最後一列
    const range = sheet.getRange(2, 1, lastRow - 1, 1);
    const values = range.getValues().flat().filter(String).map(String);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', data: values }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 POST 請求，用於新增或刪除餐廳
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    
    if (!requestData.action || !requestData.name) {
      throw new Error("缺少 'action' 或 'name' 參數");
    }

    const restaurantName = requestData.name.trim();

    if (requestData.action === 'add') {
      // 新增餐廳
      sheet.appendRow([restaurantName]);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: `${restaurantName} 已新增` }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (requestData.action === 'delete') {
      // 刪除餐廳
      const data = sheet.getDataRange().getValues();
      let rowIndexToDelete = -1;

      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === restaurantName) {
          rowIndexToDelete = i + 1; // rowIndex 是從 1 開始計算
          break;
        }
      }

      if (rowIndexToDelete !== -1) {
        sheet.deleteRow(rowIndexToDelete);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'success', message: `${restaurantName} 已刪除` }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error(`找不到餐廳: ${restaurantName}`);
      }
    } else {
      throw new Error(`未知的 action: ${requestData.action}`);
    }

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}