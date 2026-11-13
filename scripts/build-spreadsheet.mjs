import {build} from 'esbuild';
export async function withSpreadsheet(html){
 const result=await build({entryPoints:['lib/spreadsheet-browser.js'],bundle:true,write:false,format:'iife',globalName:'SpreadsheetImport',platform:'browser',target:['safari16','chrome100'],minify:true,legalComments:'inline'});
 return html.replace('<!-- spreadsheet-module -->',()=>'<script>'+result.outputFiles[0].text+'</script>');
}
