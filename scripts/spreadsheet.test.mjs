import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,tableRows,suggestMapping,prepareImport,parseAmount,parseDate} from '../lib/spreadsheet.js';
const empty=()=>({accounts:[],goals:[],transactions:[]});
const headers=['Data','Descrição','Tipo','Valor','Conta','Categoria'];
const make=(rows,extra={})=>prepareImport({rows,mapping:suggestMapping(headers),state:empty(),...extra});
test('CSV brasileiro preserva acentos, delimitadores, aspas e quebras dentro de células',()=>{
 const table=tableRows(parseCSV('\uFEFFData;Descrição;Valor\r\n13/11/2026;"Café; com ""pão""\nna padaria";-12,50\r\n'));
 assert.equal(table.rows[0][1],'Café; com "pão"\nna padaria');assert.equal(table.rows[0][2],'-12,50');
 assert.deepEqual(parseCSV('Data,Descrição,Valor\n2026-11-13,Café,"12,50"')[1],['2026-11-13','Café','12,50']);
 assert.throws(()=>parseCSV('a;b\n"x;y'),/não fechadas/);assert.throws(()=>parseCSV('a;b\nx;y;z'),/colunas/);
});
test('valores em BRL e centavos são convertidos sem aceitar frações indevidas',()=>{
 for(const [value,cents] of [['R$ 1.234,56',123456],['-12,50',-1250],["'-12,50",-1250],['1234.56',123456],['1.234',123400],[12.5,1250],['(10,00)',-1000]])assert.equal(parseAmount(value),cents);
 for(const value of ['12,345','1e6','abc','',NaN,1.005])assert.throws(()=>parseAmount(value));
});
test('datas inválidas são rejeitadas, incluindo dias que o JavaScript normalizaria',()=>{
 assert.equal(parseDate('13/11/2026'),'2026-11-13');assert.equal(parseDate(new Date('2026-11-13T00:00:00Z')),'2026-11-13');
 for(const value of ['30/02/2026','2026-13-01','13/11/26','45120'])assert.throws(()=>parseDate(value));
});
test('primeira importação cria contas e lançamentos, mantendo o estado original intacto',()=>{
 const original=empty();const result=make([['01/11/2026','Salário','Receita','3000,00','Nubank','Salário'],['02/11/2026','Mercado','Despesa','150,50','nubank','Alimentação']],{state:original});
 assert.equal(result.financialError,'');assert.equal(result.accounts.length,1);assert.equal(result.transactions.length,2);assert.equal(result.transactions[1].amount,15050);assert.equal(result.transactions[1].account,result.accounts[0].id);assert.deepEqual(original,empty());
});
test('saldo inicial pode corrigir conta com despesas anteriores a receitas',()=>{
 const rows=[['13/11/2026','Mercado','Despesa','150,00','Conta','']];
 assert.match(make(rows).financialError,/insuficiente/);
 const result=make(rows,{balances:{conta:'200,00'}});assert.equal(result.financialError,'');assert.equal(result.accounts[0].initial,20000);
});
test('importação adicional preserva reservas e evita duplicação por padrão',()=>{
 const rows=[['01/11/2026','Salário','Receita','3000,00','Conta','Salário']];
 const first=make(rows);first.data.goals.push({id:'g',name:'Reserva',target:10000});
 const second=make(rows,{state:first.data});assert.equal(second.transactions.length,0);assert.equal(second.duplicates,1);assert.deepEqual(second.data,first.data);
 assert.equal(make(rows,{state:first.data,skipDuplicates:false}).transactions.length,1);
});
test('mapeamento flexível aceita valor com sinal e relata erros com a linha',()=>{
 const mapping=suggestMapping(['date','description','amount']);
 const result=prepareImport({rows:[['2026-11-13','Freelance','200'],['2026-11-13','Café','-10']],mapping,state:empty()});
 assert.deepEqual(result.transactions.map(t=>t.type),['income','expense']);
 assert.throws(()=>make([['31/02/2026','Inválido','Receita','10','Conta','']]),/Linha 2: Data inválida/);
 assert.throws(()=>make([['13/11/2026','Inválido','Receita','-10','Conta','']]),/receita não pode/);
 assert.throws(()=>make([['13/11/2026','Reserva','Aporte','10','Conta','']]),/backup JSON/);
 assert.throws(()=>prepareImport({rows:[],mapping:{date:0,description:0,amount:1},state:empty()}),/coluna diferente/);
});

// Bundled parser source contains replacement tokens such as $&. They must remain
// literal JavaScript when embedded in the HTML served by both build targets.
test('bundle da planilha é JavaScript válido no HTML final',async()=>{
 const {withSpreadsheet}=await import('./build-spreadsheet.mjs');
 const {readFile}=await import('node:fs/promises');
 const {Script}=await import('node:vm');
 const html=await withSpreadsheet(await readFile('app.html','utf8'));
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>=2);
 for(const script of scripts)assert.doesNotThrow(()=>new Script(script[1]));
});
