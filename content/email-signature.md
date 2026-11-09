# Assinatura de e-mail MATTAR

Ferramenta: `/assinatura-email.html`. Destino principal: Gmail / Google Workspace no computador.

Um único modelo para o time: nome obrigatório, função/área opcional, e-mail obrigatório, telefone opcional e site institucional fixo. Os campos vazios são omitidos. Os dados não são enviados, persistidos ou colocados no endereço da página. O preenchimento existe somente na aba atual.

A composição reúne os dados no alto, a marca em transformação ao centro e os contatos na base, sobre o papel `#F7F6F2`. Usa o motion aprovado “Onda e resposta” (`mattar-rhythm`), sem alterar o projeto, a geometria, os giros ou a velocidade. A aplicação usa o mesmo extrator de tinta do Laboratório para remover o papel antigo do vídeo. `content/email-signature-motion.json` registra a origem, os hashes, o recorte, a duração, os limites de tinta e o resultado. O GIF tem 320 × 100 px, 20 fps, 5,8 segundos por ciclo, três ciclos e aproximadamente 74 KB. Primeiro e último quadro mostram MATTAR.

A ferramenta oferece a mesma composição sem animação. Pausar a prévia não altera a seleção de exportação. A preferência de movimento reduzido começa com a opção estática.

Para regenerar: iniciar uma prévia local do diretório `public/` e executar `node scripts/prepare-email-signature.mjs`, com Playwright/Chromium e sharp disponíveis. `EMAIL_BASE_URL` seleciona a prévia (padrão `http://127.0.0.1:8775`), `EMAIL_BROWSER_MODULE` permite indicar um Playwright já instalado e `EMAIL_BROWSER_EXECUTABLE` permite selecionar um Chromium existente. O script confere o hash do MP4 local e servido antes de gerar; recortes que cortem o desenho são recusados. A preparação é derivada: os oito filmes aprovados e o projeto fonte permanecem intactos.

O HTML da assinatura é independente do CSS da ferramenta: tabela de apresentação, estilos inline, imagem GIF ou PNG pública e links HTTPS, mailto e tel. Nome e contatos permanecem como texto. Para este suporte, Arial/Helvetica é uma adaptação técnica da aplicação de e-mail; não altera as fontes vigentes do manual. Não inclui scripts, SVG, MP4, fontes externas, fotografia ou dados pessoais fictícios. A prévia inicial é explicitamente um exemplo; copiar e baixar exigem nome e e-mail válidos.

O botão copia HTML formatado e texto simples. O fallback seleciona a assinatura para cópia manual. O download HTML usa o mesmo renderizador e o endereço público da imagem, nunca localhost ou imagens data URI. As imagens precisam continuar disponíveis em `https://labmattar.com/identidade/email/mattar-onda.gif` e `https://labmattar.com/identidade/email/mattar-onda-poster.png`. O download do GIF permite inserção pelo próprio Gmail se a colagem não mantiver a imagem.

## Instalação

1. Preencher os dados e copiar a assinatura na ferramenta.
2. Gmail no computador → Configurações → Ver todas as configurações → Geral → Assinatura.
3. Criar uma assinatura MATTAR e colar. Definir os padrões de novas mensagens e respostas/encaminhamentos.
4. Salvar alterações no final da página e testar uma nova mensagem.

Orientações oficiais: https://support.google.com/mail/answer/8395?hl=pt-BR e https://support.google.com/mail/answer/11468381?hl=pt-BR . O arquivo segue a recomendação do Gmail para imagens de assinatura: 300–400 px de largura e 70–100 px de altura.

## Uso

- Preencher com os dados de trabalho e manter a ordem do modelo.
- Omitir a função ou o telefone se não forem relevantes.
- Manter a marca na proporção e no tamanho definidos. Alterar dados pela ferramenta.
- Não substituir a assinatura inteira por uma imagem: isso elimina texto selecionável e prejudica os links.
- Não adicionar banners, fontes, slogans, pictogramas ou cores por pessoa.
- Conferir o primeiro envio no Gmail e no celular. Clientes podem adaptar cores no modo escuro ou bloquear imagens; a ferramenta não controla essa decisão do destinatário.

## Verificação

Renderizador: validação de dados, escape de texto/atributos, links seguros, omissão de opcionais, equivalência de prévia/cópia/download e tamanho do fragmento abaixo do limite de 10.000 caracteres informado pelo Gmail. Revisão de navegador em desktop e mobile. O envio real pelo Gmail depende de uma conta da equipe e deve ser conferido após a instalação; a ferramenta não acessa contas nem envia mensagens.
