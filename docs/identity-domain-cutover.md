# Operacao isolada: dominio da identidade

## Escopo imutavel

Esta operacao muda exclusivamente **a associacao de \`identidade.labmattar.com\`** entre
\`mattar-portfolio\` e \`labmattar-identidade\`. Nao altera arquivos, conteudo,
capitulos, galerias, projetos, manifestos institucionais, banco D1 nem a
associacao de \`labmattar.com\`. Nao altera registros DNS manualmente e nunca
executa \`publish-official.yml\`.

**A publicacao do portfolio sem o manual e uma operacao posterior, separada e
nao autorizada por esta migracao**. Antes dela, comparar capitulo por capitulo
contra a base oficial; nao aprovar alteracoes institucionais implicitas.

## Dependencias verificadas pela auditoria

- \`main\` e a revisao SHA exata do Worker separado, com manifesto de release
  publicado em \`https://labmattar-identidade.vitormoreiran.workers.dev\`.
- Existencia de \`labmattar.com\` apontando a \`mattar-portfolio\` e
  \`identidade.labmattar.com\` apontando ao servico anterior ou novo.
- Páginas essenciais do manual e ferramentas devolvem HTML no Worker separado.
- \`/api/acervo/status\` no Worker separado confirma \`google.configured=true\`.
  Dropbox nao e pre-requisito.
- A home institucional responde em \`https://labmattar.com/\`.
- Chave Cloudflare e ID de conta sao fornecidos apenas via GitHub Secrets.
  O artefato de auditoria nao contem credenciais.

## Modos de uso

1. Integrar o PR somente depois que testes da branch estiverem aprovados.
2. No GitHub Actions, selecionar **Verificar ou transferir dominio exclusivo da identidade**
   na branch **main**. Informar o SHA completo da revisao publicada
   (\`52bcb1631f18c7e74ea96e9f71ea5823779ae2c4\` na preparacao inicial)
   e selecionar **audit** (padrao). Nao preencher confirmacao.
3. O run \`audit\` nao faz PUT/DELETE. Em caso de Success, ele anexa
   \`identity-domain-audit-SHA\` com o vinculo original e o estado da Google.
4. Para transferir, requer decisao humana especifica, o mesmo SHA do \`main\`,
   \`audit_run_id\` que gerou a evidencia aprovada, modo **apply** e a
   confirmacao literal \`VINCULAR IDENTIDADE AO WORKER EXCLUSIVO\`.
5. A acao \`apply\` primeiro refaz todos os testes sem alterar dominios,
   confere a auditoria anterior e **depois** faz um unico PUT
   \`/accounts/{account_id}/workers/domains\` para
   \`identidade.labmattar.com → labmattar-identidade\`.
   Exige confirmacao do estado persistido e verifica o manual no dominio oficial.
6. Conferir no navegador: manual, Matriz, Compor, Cartao MATTAR e **Google Drive**
   em \`identidade.labmattar.com\`. Os logins OAuth podem exigir novo acesso,
   mas os projetos salvos no mesmo subdominio mantem a origem.
7. Somente depois avaliar uma **outra** publicacao institucional manual com
   preservacao dos 658 arquivos de base e validacao de todos os capitulos.

## Reversao

Se o Worker exclusivo falhar, antes de publicar a versao institucional limpa
podemos restaurar o vinculo \`identidade.labmattar.com → mattar-portfolio\`
no Cloudflare, com aprovacao explicita e verificacao do site. Nao executar
\`publish-official.yml\` para tentar corrigir uma falha de identidade.
A operacao de reversao deve ser decidida e registrada separadamente.

## Pontos de atencao

- Uma alteracao posterior em \`main\` exige novo build do Worker exclusivo,
  novo teste e nova auditoria; o workflow bloqueia SHA antigo.
- O workflow \`audit\` nao transfere dominio.
- \`apply\` e a unica operacao capaz de alterar vinculo Cloudflare neste
  fluxo; nunca a executar sem a auditoria.
- Se Google Drive ainda nao estiver configurado no novo Worker, o fluxo
  bloqueia a migracao. Segredos devem ser configurados diretamente no
  ambiente seguro do Worker, sem copias em arquivos ou mensagens.
