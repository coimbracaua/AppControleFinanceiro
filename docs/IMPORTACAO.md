# Importar planilhas

Após criar sua senha e entrar, uma conta sem dados mostra **Importar planilha** na tela Início. A opção também está em **Ajustes → Traga seus lançamentos** para importações posteriores.

Aceita arquivos `.xlsx` ou `.csv` de até 4 MB, com cabeçalho na primeira linha e até 10.000 lançamentos. Salve arquivos `.xls` como `.xlsx` antes de importar. Em Excel com várias abas de dados, escolha qual importar. O modelo CSV pode ser baixado dentro do diálogo.

Selecione as colunas Data, Descrição e Valor; Tipo, Conta e Categoria são opcionais. São reconhecidos cabeçalhos comuns em português e inglês. As datas aceitam DD/MM/AAAA e AAAA-MM-DD; datas formatadas no Excel também são reconhecidas. Valores usam até duas casas decimais, incluindo BRL como `1.234,56`. Sem Tipo, valores negativos são despesas e positivos são receitas. Com Tipo, use Receita/Entrada/Crédito ou Despesa/Saída/Débito. Aportes e resgates requerem o backup JSON original.

Contas existentes são encontradas pelo nome, ignorando maiúsculas e acentos. Contas novas permitem informar o saldo anterior ao primeiro lançamento importado. Linhas sem conta usam o nome definido no diálogo. A prévia mostra totais, até cinco lançamentos, novas contas e possíveis duplicados. Por padrão, lançamentos com mesma data, descrição, tipo, valor, conta e categoria são ignorados; desmarque essa opção se movimentos idênticos forem intencionais.

Nada é gravado antes de **Confirmar importação**. Dados existentes são preservados e novos lançamentos são adicionados. Qualquer erro impede a confirmação do lote completo; não há importação parcial. As validações financeiras e de concorrência do servidor continuam valendo. Se outra aba alterar os dados, recarregue o app e refaça a prévia antes de confirmar.

A leitura do arquivo ocorre no dispositivo; somente os registros confirmados são enviados para o armazenamento do app. Fórmulas/macros não são executadas. CSV deve ser exportado com codificação UTF-8 e separador ponto e vírgula, vírgula ou tabulação.
