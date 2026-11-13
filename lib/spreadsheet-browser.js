import readExcelFile from 'read-excel-file/browser';
import {parseCSV,tableRows,suggestMapping,prepareImport,normalize} from './spreadsheet.js';
export {suggestMapping,prepareImport,normalize};
export async function readFile(file){
 if(file.size>4000000)throw Error('A planilha excede 4 MB.');
 if(/\.csv$/i.test(file.name))return [{name:file.name,...tableRows(parseCSV(await file.text()))}];
 if(!/\.xlsx$/i.test(file.name))throw Error('Selecione um arquivo .xlsx ou .csv. Para .xls, salve como .xlsx no Excel.');
 let sheets;try{sheets=await readExcelFile(file)}catch{throw Error('Não foi possível ler o Excel. Use um arquivo .xlsx válido, sem senha.')}
 return sheets.filter(s=>s.data.filter(row=>row.some(v=>v!==null&&v!==undefined&&String(v).trim()!=='')).length>=2).map(s=>({name:s.sheet,...tableRows(s.data)}));
}
