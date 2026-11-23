# LABMATTAR — separação definitiva entre site e identidade

**Status:** implementação em branch isolada. NÃO integrar nem trocar o domínio antes dos testes.
**Objetivo:** uma única publicação oficial da identidade em `https://identidade.labmattar.com`, sem páginas, ferramentas ou API do manual em `https://labmattar.com`.

## Propriedade de cada serviço

| Serviço | Domínio | Fonte |
| --- | --- | --- |
| `mattar-portfolio` | `labmattar.com` | `site-oficial/public` recuperado e verificado + ajustes institucionais explícitos + apresentações publicadas |
| `labmattar-identidade` | `identidade.labmattar.com` | `dist/client`, `dist/server`, `identity/worker/entry.mjs` e `scripts/acervo-api.mjs` |
| `labmattar-identidade-previa` | Workers.dev de prévia, sem domínio de produção | build de teste existente |

Compartilham **repositório**, não Worker, pacote de assets, vinculação de domínio ou banco. O D1 `mattar-editor` permanece exclusivamente no Worker institucional. As credenciais Google/Dropbox necessárias ao acervo da identidade devem estar configuradas **separadamente** no novo Worker, pelo painel seguro, sem passar pelo Git.

## Invariantes (bloqueantes)

1. Não alterar a home, os capítulos e as publicações de portfólio em `labmattar.com`. Não apagar ou sobrescrever `site-oficial/`, banco D1 ou arquivos históricos.
2. Não servir páginas nem assets exclusivos do manual em `labmattar.com`: `/inicio`, `/manual`, `/motion`, `/tipografia`, `/cores`, `/composicao`, `/laboratorio`, `/compor`, `/montar`, `/assinatura-email`, `/redes`, Matriz e API `/api/acervo` pertencem à identidade.
3. A fonte Univers ou Perpetua presente na base institucional é **compartilhada historicamente** e não deve ser apagada se utilizada pelo portfólio. Separação de apps não significa apagar mídia institucional.
4. O sistema de identidade é mantido em uma única fonte de código, mas gera um pacote **próprio**. Não duplicar o editor nem manter duas cópias evolutivas.
5. Só o Worker da identidade pode publicar na URL `identidade.labmattar.com`; o workflow institucional nunca deve religar esse domínio ao portfólio.
6. O portfólio NÃO é republicado a cada atualização do manual.

## Sequência segura de implantação

1. **Congelar evidências**: anotar revisão e versão Cloudflare ativas em ambos os endereços, guardar o histórico do Worker `mattar-portfolio` e inventariar conteúdo institucional acrescentado ao baseline. Confirmar que a montagem institucional conserva os 658 arquivos-base, correção de galeria e apresentações publicadas.
2. **Construir e validar o Worker exclusivo**: usar `Preparar Worker exclusivo da identidade` apontando para um run válido da prévia no `main`. Primeira execução com `deploy_staging=false` (dry run); depois, apenas com o resultado conferido, `deploy_staging=true`. Isso publica somente `labmattar-identidade.vitormoreiran.workers.dev`, sem tocar nos dois domínios oficiais.
3. **Configurar segredos no novo Worker**: verificar OAuth/Google, Dropbox, chave de sessão, origem `LM_ACERVO_ORIGIN=https://identidade.labmattar.com` e URLs autorizadas nos provedores. Cookies/sessões do usuário devem continuar no hostname da identidade. Nunca copiar segredos ao repositório.
4. **Auditar pré-produção**: introdução, capítulos 01–07, Matriz, composição, assinatura, mídias, exportações e mobile. Os recursos estáticos devem carregar no Worker independente; confirmar o hash do manifesto `laboratorio-release.json`.
5. **Migrar SOMENTE o domínio da identidade**: usar `scripts/migrate-identity-domain.mjs` com `IDENTITY_RELEASE_SHA`, credenciais Cloudflare e confirmação textual `IDENTITY_CUTOVER_CONFIRM='VINCULAR IDENTIDADE AO WORKER EXCLUSIVO'`, primeiro sem `--apply`, depois com `--apply`. A API faz PUT no vínculo existente, sem apagar registros DNS nem projetos.
6. **Validar o subdomínio oficial**: testar `https://identidade.labmattar.com` em desktop/mobile, acervo Google/Dropbox e editor; verificar que a versão do novo Worker corresponde ao manifesto e que o serviço institucional ainda mantém as rotas originais. **Se falhar, voltar o vínculo ao Worker anterior antes de retirar o manual dele.**
7. **Publicar o portfólio limpo**: depois da validação do domínio separado, executar manualmente `Publicar labmattar.com oficial` para implantar o pacote institucional sem arquivos do manual. Conferir a home e os projetos originais e confirmar que os caminhos de identidade retornam 404, não páginas nem redirecionamentos. O `portfolio-release.json` é a prova da revisão institucional.
8. **Estabilizar**: integrar os REVIEWs editorialmente aprovados somente na identidade; instituir deploy automático exclusivo da identidade depois de verificar segurança e isolamento. Não remover branches, histórico nem caches até a reconciliação final.

## Reversão

Antes do passo 7, o Worker antigo ainda hospeda a versão anterior do manual; se o novo Worker falhar após mover o domínio, restaurar o vínculo anterior `identidade.labmattar.com → mattar-portfolio` pela Cloudflare. Depois do passo 7, a reversão exige também restaurar uma versão anterior do Worker institucional no histórico Cloudflare; não reexecutar cegamente o workflow limpo.

## Estado dos testes

`scripts/test-official-publication.mjs` verifica preservação do portfólio e exclusão do manual. `scripts/test-official-routing.mjs` verifica que o Worker institucional retorna 404 para rotas do manual, enquanto preserva projetos originais. `scripts/test-deployment-boundaries.mjs` verifica a montagem do Worker independente sem D1 institucional. `scripts/test-identity-domain.mjs` assegura que a configuração antiga não pode religar o domínio ao portfólio e que a migração exige autorização e preflight.

**Não afirmar que a separação foi publicada enquanto não houver evidência das duas URLs em produção.**
