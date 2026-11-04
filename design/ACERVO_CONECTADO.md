# LABMATTAR / Acervo conectado (Google Drive e Dropbox)

**Status:** interface e API integradas à prévia. A autenticação real só fica disponível depois do registro de aplicativos OAuth e da inclusão das credenciais no Cloudflare. Não altera a Matriz Vetorial nem `labmattar.com`.

## Interface

O painel **Fundo + M** em `/compor.html?studio=1#laboratorio` oferece **Adicionar da nuvem**, com ícones e escolhas separadas para Google Drive e Dropbox. Quando o OAuth ainda não está configurado, mostra uma explicação acionável no próprio seletor, sem abrir diálogo vazio. A conexão às duas contas Drive usa Google Picker com `drive.file`, exigindo seleção explícita, e Dropbox permite navegar em diretórios com `files.metadata.read` + `files.content.read`. Fotos escolhidas alimentam os mesmos campos de fotografia, foco, M e blur existentes. O seletor também reconhece arquivos de vídeo, mas **não os insere na composição estática**: a reprodução/composição de vídeo depende de etapa posterior.

A imagem é servida pelo backend em `/api/acervo/media` com autenticação. URLs nos JSONs contêm identificadores, não credenciais. Os JSONs salvos exigem acesso à conta original para reabertura. Miniaturas não são masters.

## Fonte fixa do LABMATTAR — 01_Portfolio

O acervo padrão deste Laboratório é somente a pasta privada
[01_Portfolio](https://drive.google.com/drive/folders/13SMGPjdZF3jxEmM4OmWi0T1OoBPCNJqW),
organizada por projetos. O seletor Google Picker abre já dentro dela
(`DocsView.setParent`), mostra as subpastas dos projetos e não
permite escolher uma pasta no lugar de uma fotografia.

**Importante:** `setParent` define a **pasta inicial**, não é uma barreira
de autorização que impeça navegar para fora. O escopo do OAuth segue
`drive.file` (sem acesso geral ao Drive): somente os arquivos
explicitamente escolhidos no Picker são acessíveis ao Laboratório.
Acesso à pasta depende das permissões individuais do Google Drive.

Sem a autorização de abrir, copiar ou publicar os originais para fora
do Drive, o Laboratório não cria uma galeria pública nem uma cópia da
pasta. Para exibir automaticamente *todas* as fotos da pasta a usuários
sem login seria preciso configurar uma biblioteca administrada com
controle de acesso ou obter autorização explícita para publicar cópias.

Se o Picker não abrir, o modal deixa uma mensagem de erro contextual
e um link para conferência da pasta original no Google Drive, sem
retornar uma falsa mensagem de sucesso.

## Inserção de fotografias e vídeos nos projetos

- **Fotografias:** escolha no Google Picker (pasta inicial 01_Portfolio) ou Dropbox;
  elas passam ao catálogo da página e podem ocupar fundo, M e marcadores,
  mantendo enquadramento coerente nas três camadas.
- **Vídeos:** escolha no mesmo seletor. Cada vídeo vira um elemento da página ativa,
  com controles em **MOTION → Vídeos do acervo** para posição, largura, quadro
  estático e reprodução sem som em loop. Até 8 vídeos por página.
- **Projeto JSON:** guarda somente \`provider\`, identificador do arquivo,
  tipo, nome e geometria. Não inclui bytes do vídeo ou tokens. Reabrir o
  projeto demanda acesso privado válido ao Drive/Dropbox para tocar os originais.
  Projetos anteriores, sem vídeos, permanecem válidos.
- **PDF / PNG:** capturam um quadro no segundo configurado; não há áudio ou
  reprodução em arquivos estáticos.
- **Site HTML offline:** incorporar vídeos privados no arquivo só após
  confirmação explícita do usuário. Há limite de 32 MB por vídeo e 64 MB
  por projeto, pois vídeos grandes geram HTML impraticavelmente pesado.
  Para vídeos maiores, é necessário um serviço de streaming/hospedagem
  com autenticação apropriada, não links públicos improvisados.
- **Permissões:** não alterar compartilhamento da pasta para "qualquer pessoa".
  A conexão de um usuário não transfere suas permissões para outro.

## Segurança

- OAuth 2.0 com PKCE e `state` criptografado, validade de 10 minutos.
- Tokens AES-256-GCM com chave privada de 32 bytes, armazenados em cookies `HttpOnly; Secure; SameSite=Lax`, vinculados ao domínio da prévia. Nunca enviar tokens ao GitHub.
- Token temporário do Google Picker em memória somente para diálogo de seleção (requisito do Google Picker). O código não o salva em `localStorage`.
- Backend verifica autenticação para metadados, imagens e downloads. Identificadores são validados e os domínios de endpoints dos provedores são fixos. Não há suporte para URLs arbitrárias.
- Desconectar remove a sessão local; tentativa de revogação no provedor é de melhor esforço. Para revogação definitiva use também a página de permissões de aplicativos do Google/Dropbox.
- Media originals are not cached publicly; headers `Cache-Control: private, no-store` e `X-Content-Type-Options: nosniff`.
- IDs e nomes de mídias selecionadas podem permanecer no `sessionStorage` do navegador para restaurar a seleção. Não são credenciais, mas devem ser tratados como metadados privados.
- **Limite atual**: cookies de sessão criptografados, sem banco de usuários; sessões persistentes até 7 dias. Não atende compartilhamento multiusuário ou políticas corporativas de governança. Requer auditoria antes de ser considerado produção.

## Atualizações automáticas / Cloudflare

O GitHub publica o Worker de prévia com `npx wrangler deploy --keep-vars` e `keep_vars: true`.
**Nunca remover essa opção:** sem ela, um deploy automático apaga as variáveis simples
criadas pelo painel Cloudflare (mas não os Secrets), fazendo o Laboratório voltar
ao estado **Ativação pendente**.

Os identificadores públicos `LM_ACERVO_ORIGIN`, `LM_GOOGLE_CLIENT_ID` e
`LM_GOOGLE_APP_ID` estão declarados no arquivo temporário de deploy
`wrangler.preview.jsonc` gerado pelo workflow. Eles não são senhas.
**Não adicionar Client Secret, chaves de sessão ou chaves de API ao GitHub.**

Para recuperar a conexão depois de um deploy antigo que apagou as variáveis,
confirme no Cloudflare que `LM_GOOGLE_PICKER_API_KEY` ainda existe. Se tiver
desaparecido, adicione novamente via **Settings → Variables and Secrets**,
preferencialmente com tipo **Secret**; use o valor existente no Google Cloud
em *APIs & Services → Credentials → LABMATTAR Picker*. Não o compartilhe no chat.
Essa API key é utilizada no browser pelo Google Picker e, portanto, deve
permanecer restrita ao domínio do Worker e às APIs necessárias.

A inclusão de um Secret via painel cria uma nova versão do Worker. Depois,
reabra a biblioteca de mídia e confirme **Conectar conta** ou **Conectado**
em vez de **Ativação pendente**. O campo `LM_ACERVO_ENCRYPTION_KEY` deve ser
mantido com o mesmo valor para preservar sessões já autorizadas.

## Configuração obrigatória na prévia Cloudflare

Criar aplicações OAuth oficiais e definir URL de retorno exata:

- `https://labmattar-identidade-previa.vitormoreiran.workers.dev/api/acervo/callback/google`
- `https://labmattar-identidade-previa.vitormoreiran.workers.dev/api/acervo/callback/dropbox`

Para Google Drive, habilitar Google Drive API e Google Picker API. Configurar OAuth consent screen e adicionar usuários de teste, se o aplicativo estiver em modo de teste. Usar Google Cloud Project Number como `LM_GOOGLE_APP_ID`, e API key restringida ao domínio de prévia.

Para Dropbox, habilitar os escopos `files.metadata.read` e `files.content.read` no app console, e configurar redirect URI.

Secrets/bindings Cloudflare Workers (via `wrangler secret put <NAME> --name labmattar-identidade-previa` ou painel Cloudflare):

| Nome | Uso |
| --- | --- |
| `LM_ACERVO_ORIGIN` | URL base HTTPS exata da prévia (sem barra final) |
| `LM_ACERVO_ENCRYPTION_KEY` | 32 bytes aleatórios em base64url, gerados criptograficamente, nunca commitados |
| `LM_GOOGLE_CLIENT_ID` | OAuth client id para Web Application |
| `LM_GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `LM_GOOGLE_PICKER_API_KEY` | chave de API do Picker restrita ao domínio |
| `LM_GOOGLE_APP_ID` | número do projeto Google Cloud |
| `LM_DROPBOX_CLIENT_ID` | App key Dropbox |
| `LM_DROPBOX_CLIENT_SECRET` | App secret Dropbox |

Gerar chave localmente: `node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64url"))'`. Nunca colar os valores no chat, logs, Markdown, GitHub ou código da aplicação. Conectar as credenciais apenas no gerenciador de segredos do Cloudflare.

Se as credenciais estiverem ausentes, o diálogo mostra **Conexão ainda não ativada** e remete a este guia. Nenhum login falso ou link público é usado. A API recusa iniciar OAuth antes da configuração.

O login autorizado **retorna à página Compor** (e não ao índice `/laboratorio.html`) e informa o estado da conexão. Após habilitar as credenciais no servidor, abrir o seletor novamente recarrega os estados sem novo deploy.

**Verificação UI:** `COMPOSITION_URL=http://127.0.0.1:8765/compor.html node scripts/smoke-acervo-ui.mjs` (teste com API simulada, sem senhas reais).

## Verificação necessária

1. `node scripts/test-acervo.mjs` e `node --check scripts/acervo-api.mjs`.
2. CI normal + navegador da prévia no PR, respeitando o workflow existente.
3. Teste real com conta Google (selecionar imagem, trocar foco, salvar PNG, recarregar, reabrir JSON, desconectar).
4. Repetir no Dropbox; verificar isolamento entre contas e revogação.
5. Conferir PNG 2K/4K com fotografia original e contraste do M nos quatro formatos, e testar imagem sem permissão/desaparecida.
6. Revisão de segurança do endpoint de mídia e da retenção de sessão antes de merge/deploy.

**Sem credenciais configuradas e testes de ponta a ponta, não marcar como pronto nem anunciar publicação.**
