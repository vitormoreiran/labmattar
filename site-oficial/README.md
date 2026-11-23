# Site oficial — labmattar.com

Esta é a base recuperada do serviço `mattar-portfolio`, versão ativa `ae4852f0-ec18-4544-8406-3c0be5b99928` de 29/10/2026. O módulo executável foi baixado da API oficial; os arquivos públicos de texto e as mídias foram conferidos contra o domínio em 04/11/2026. `baseline.json` registra os hashes dos 658 arquivos. O banco D1 e as credenciais continuam no Cloudflare.

## Publicação institucional preservada

O Worker `mattar-portfolio` atende exclusivamente `https://labmattar.com`: página inicial, projetos, capítulos institucionais e apresentações autorizadas. A montagem conserva a base recuperada (658 arquivos verificados), o complemento aprovado da galeria e as apresentações institucionais explicitamente publicadas. **Nenhum arquivo HTML, editor, mídia ou API exclusivos do Manual de Identidade é copiado para este serviço.**

O manual, a Matriz e o Laboratório pertencem ao serviço separado `labmattar-identidade` em `https://identidade.labmattar.com`; o procedimento de migração sem perda de dados está em `docs/domain-separation.md`.

O fluxo **Publicar labmattar.com oficial** é de execução manual autorizada, não é disparado por edições da identidade. O Worker institucional continua usando o mesmo D1 `mattar-editor`, seus projetos e credenciais existentes. Não há migração do banco.

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

O ajuste da galeria do capítulo 2 integrado no PR #122 fica em `public/chapter2-gallery-scale.css`. A montagem acrescenta esse complemento ao CSS do pacote final depois de conferir a base. O arquivo recuperado e seu hash original permanecem intactos; o CSS publicado mantém exatamente o conteúdo da alteração já integrada.

As versões do GitHub recebem a etiqueta `github-official-<commit>`. O Cloudflare mantém o histórico; uma reversão deve escolher explicitamente a versão desejada. O workflow confere a revisão servida e a disponibilidade da home, dos três projetos e do Laboratório depois do deploy.

## Vídeo MP4 no Laboratório

Em **Revisar e exportar → Vídeo MP4**, escolha a página em edição ou a sequência completa, a duração de cada página (2 a 30 segundos) e HD ou Full HD. O arquivo usa H.264, 30 fps e não contém áudio. A entrada dos textos pode ser ligada ou desligada; motions e vídeos selecionados continuam animados. A sequência usa cortes entre páginas e requer o mesmo formato em todas elas. Limite total: 3 minutos.

O renderizador usa as mesmas camadas, fontes, máscaras e enquadramentos do PNG/PDF. Vídeos de fundo de uma mesma seção continuam no tempo entre páginas. Cada motion começa do início em cada página. O quadro escolhido para o PDF não limita o vídeo. O formato quadrado sai em 1080×1080 (Full HD) ou 720×720 (HD); os demais mantêm o formato com maior lado de 1920 ou 1280 px, arredondado a dimensões pares.

Use Chrome ou Edge atualizado com WebCodecs/H.264 disponível. Mantenha a aba aberta durante a renderização. **Cancelar vídeo** interrompe a codificação e preserva o projeto; falhas de mídia ou codec não geram arquivo parcial. A exportação é processada no navegador e não publica a apresentação. PDF, PNG e HTML seguem disponíveis.

Validação: smoke-lab-video.mjs baixa MP4 reais em quatro formatos, verifica H.264/30 fps/ausência de áudio/duração com ffprobe, compara o quadro final com a cena nativa e testa sequência com motion e vídeo de fundo, cancelamento e formatos incompatíveis.

## Prévia e tratamento da imagem

No editor aberto em tela cheia, a página ocupa até 90% da dimensão disponível no desktop. O encaixe usa uma escala única, inclusive acima de 100%, sem alterar as dimensões lógicas, a tipografia ou as exportações. No celular e no tablet, a prévia continua usando o espaço útil inteiro.

Em **Editar página → Imagem → Foto ou vídeo**, escolha **Padrão**, **Desfoque** ou **Vidro**. Padrão mantém a aparência dos projetos anteriores. Desfoque preserva as cores da mídia; Vidro acrescenta uma difusão mais luminosa e um reflexo suave. Ajuste **Intensidade do desfoque** de 0 a 100%; no modo Vidro, **Reflexo do vidro** regula a luz separadamente. **Tratamento de leitura** continua controlando apenas o véu preto sobre a imagem.

Os efeitos pertencem à fotografia e ao vídeo; não deformam M, símbolos ou textos. São salvos no projeto e compartilhados pelo fundo da seção. PNG, PDF e MP4 usam as mesmas camadas do renderizador; o HTML conserva o filtro e o reflexo, inclusive no fundo de vídeo. O modo Vidro é uma difusão luminosa, sem refração geométrica do conteúdo.
