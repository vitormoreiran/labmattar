# LABMATTAR / Acervo conectado (Google Drive e Dropbox)

**Status:** implementação em branch para revisão; não publicada nem autorizada para produção. Não altera a Matriz Vetorial ou o domínio `labmattar.com`.

## Interface

O painel **Imagem / M** em `/laboratorio.html` oferece conexão às duas contas. Drive usa Google Picker com `drive.file`, exigindo seleção explícita, e Dropbox permite navegar em diretórios com `files.metadata.read` + `files.content.read`. Fotos escolhidas alimentam os mesmos campos de fotografia, foco, M e blur existentes. O seletor também reconhece arquivos de vídeo, mas **não os insere na composição estática**: a reprodução/composição de vídeo depende de etapa posterior.

A imagem é servida pelo backend em `/api/acervo/media` com autenticação. URLs nos JSONs contêm identificadores, não credenciais. Os JSONs salvos exigem acesso à conta original para reabertura. Miniaturas não são masters.

## Segurança

- OAuth 2.0 com PKCE e `state` criptografado, validade de 10 minutos.
- Tokens AES-256-GCM com chave privada de 32 bytes, armazenados em cookies `HttpOnly; Secure; SameSite=Lax`, vinculados ao domínio da prévia. Nunca enviar tokens ao GitHub.
- Token temporário do Google Picker em memória somente para diálogo de seleção (requisito do Google Picker). O código não o salva em `localStorage`.
- Backend verifica autenticação para metadados, imagens e downloads. Identificadores são validados e os domínios de endpoints dos provedores são fixos. Não há suporte para URLs arbitrárias.
- Desconectar remove a sessão local; tentativa de revogação no provedor é de melhor esforço. Para revogação definitiva use também a página de permissões de aplicativos do Google/Dropbox.
- Media originals are not cached publicly; headers `Cache-Control: private, no-store` e `X-Content-Type-Options: nosniff`.
- IDs e nomes de mídias selecionadas podem permanecer no `sessionStorage` do navegador para restaurar a seleção. Não são credenciais, mas devem ser tratados como metadados privados.
- **Limite atual**: cookies de sessão criptografados, sem banco de usuários; sessões persistentes até 7 dias. Não atende compartilhamento multiusuário ou políticas corporativas de governança. Requer auditoria antes de ser considerado produção.

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

Se credenciais estiverem ausentes, a interface informa **Configuração necessária** e a API recusa iniciar OAuth; nenhum link inseguro é apresentado.

## Verificação necessária

1. `node scripts/test-acervo.mjs` e `node --check scripts/acervo-api.mjs`.
2. CI normal + navegador da prévia no PR, respeitando o workflow existente.
3. Teste real com conta Google (selecionar imagem, trocar foco, salvar PNG, recarregar, reabrir JSON, desconectar).
4. Repetir no Dropbox; verificar isolamento entre contas e revogação.
5. Conferir PNG 2K/4K com fotografia original e contraste do M nos quatro formatos, e testar imagem sem permissão/desaparecida.
6. Revisão de segurança do endpoint de mídia e da retenção de sessão antes de merge/deploy.

**Sem credenciais configuradas e testes de ponta a ponta, não marcar como pronto nem anunciar publicação.**
