# Site oficial — labmattar.com

Esta é a base recuperada do serviço `mattar-portfolio`, versão ativa `ae4852f0-ec18-4544-8406-3c0be5b99928` de 29/10/2026. O módulo executável foi baixado da API oficial; os arquivos públicos de texto e as mídias foram conferidos contra o domínio em 04/11/2026. `baseline.json` registra os hashes dos 658 arquivos. O banco D1 e as credenciais continuam no Cloudflare.

## O que será publicado

O workflow **Publicar labmattar.com oficial** recebe o artefato do workflow **Publicar previa LABMATTAR**, depois dos testes, no mesmo commit do `main`. Ele preserva a página inicial e os capítulos existentes e acrescenta os arquivos do Laboratório. A montagem recusa colisões de arquivos e endereços reservados.

- Laboratório: `https://labmattar.com/laboratorio/`.
- Motion: `https://labmattar.com/motion.html`.
- Nova apresentação: `https://labmattar.com/capitulo-4/<endereco>/`.

O destino é o Worker existente `mattar-portfolio`, com o mesmo banco `mattar-editor`. Não há migração de banco. O deploy conserva variáveis e segredos existentes com `--keep-vars`. As conexões do acervo dependem das credenciais e origens autorizadas configuradas no serviço oficial; elas não são copiadas da prévia.

## Publicar uma apresentação criada no Laboratório

1. Monte as seções e páginas; confira o site e exporte o HTML.
2. Prepare uma pasta nova no repositório:

   `node scripts/prepare-chapter4-publication.mjs "apresentacao.html" nome-do-projeto presentations/nome-do-projeto`

3. Revise o HTML e as mídias que ficarão públicas. No `publication.json`, altere `status` de `draft` para `published` quando a apresentação estiver aprovada. O pacote continua rascunho até essa alteração.
4. Envie a pasta em um PR para o `main`. Após a integração e os testes, o GitHub publica o endereço indicado no manifesto.

Baixar HTML permite compartilhar um arquivo offline; não envia automaticamente o projeto ao servidor. O editor não recebe tokens do GitHub ou Cloudflare e ainda não tem um botão de publicação direta.

## Manutenção

Sesc, Bradesco e Simpósio mantêm suas rotas. A home e o acesso atual ao capítulo 4 continuam no módulo original. Novas apresentações são compartilhadas pelo endereço próprio; não são adicionadas automaticamente à tela de códigos do capítulo 4.

Não edite os arquivos recuperados diretamente para corrigir o Laboratório. Edite `design/`, `public/`, `tools/` e os scripts de montagem. Se o domínio receber outra publicação por fora do GitHub, a verificação interrompe o deploy até que essa versão seja recuperada e conferida. Isso impede que um build antigo desfaça alterações publicadas por outro chat.

As versões do GitHub recebem a etiqueta `github-official-<commit>`. O Cloudflare mantém o histórico; uma reversão deve escolher explicitamente a versão desejada. O workflow confere a revisão servida e a disponibilidade da home, dos três projetos e do Laboratório depois do deploy.
