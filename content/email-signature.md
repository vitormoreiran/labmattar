# Cartão MATTAR — quatro composições de assinatura

Endereço principal: https://identidade.labmattar.com/assinatura-email . Acesso também pelo overview do Laboratório e pelo menu Ferramentas. Os endereços anteriores continuam válidos.

As quatro composições foram reorganizadas na faixa de 480 × 100 px, retomando o tamanho anterior solicitado pelo autor. O gerador mantém os vetores nativos e as cores; os dados de exemplo mostram Joana Oliveira e não são preenchidos automaticamente no formulário.

| Modelo | Identificador | Tamanho de uso | PNG em alta | Movimento |
| --- | --- | --- | --- | --- |
| 01 / M horizontal | m-horizontal | 480 × 100 px | 960 × 200 px | M + Forma |
| 02 / M compacto | m-compacto | 480 × 100 px | 960 × 200 px | M + Forma |
| 03 / MATTAR na faixa | mattar-faixa | 480 × 100 px | 960 × 200 px | Assinatura fixa |
| 04 / M com linha | m-linha | 480 × 100 px | 960 × 200 px | M + Forma |

O Cartão digital anterior permanece disponível em 480 × 280 px, com exportação em 960 × 560 px. As quatro opções de e-mail usam 480 × 100 px, com elementos recompostos nessa área. Os estudos mais altos de 360 × 180 e 320 × 160 px são históricos e não definem a exportação vigente.

## Escolha e personalização

A página inicia em Para e-mail e mostra os quatro modelos. A escolha pode ser compartilhada pelo parâmetro modelo no endereço, por exemplo ?modelo=m-compacto. O usuário escolhe o modelo, preenche nome, função, e-mail e telefone e exporta. Nome e e-mail são obrigatórios; função e telefone são opcionais. Os dados ficam apenas na página, sem gravação local ou envio a um servidor.

O nome usa Univers LT Std 45 Light em 18 px; função e contatos usam 12 px. M compacto divide o nome em até duas linhas, preservando palavras inteiras. Os demais usam uma linha. Nomes, funções ou contatos que excedam a área produzem erro no campo e bloqueiam o PNG, GIF e HTML. O gerador não comprime os vetores, reduz a fonte ou corta o arquivo exportado para fazê-lo caber. Um endereço longo deve usar outro modelo com mais espaço.

Fundo, Texto e M / faixa são escolhas independentes da paleta de oito cores. O padrão usa Papel, Preto e Vermelho; M com linha inicia em Branco, Preto e Vermelho. Cores personalizadas acompanham a troca de modelo. Restaurar padrão recupera a combinação do modelo atual sem apagar os dados. O contraste considera também o texto claro sobre a faixa.

## Imagens, movimento e arquivos

A prévia inicia fixa e mostra o M nativo no mesmo enquadramento do PNG. O botão Animar usa o filme aprovado M + Forma. A pausa recupera o quadro fixo da assinatura. MATTAR na faixa conserva a assinatura nativa completa e não oferece motion.

A prévia ocupa a largura disponível em uma área clara, sem moldura ou sombra, com resolução adicional em telas de alta densidade. Ampliar abre uma visualização maior; no celular a imagem pode ser percorrida horizontalmente. Essa ampliação pertence à interface: PNG e GIF mantêm 480 × 100 px e o PNG em alta, 960 × 200 px.

O PNG em tamanho de uso tem as dimensões da tabela. PNG em alta contém duas vezes os pixels e deve ser exibido no tamanho de uso. O HTML incorpora a imagem em alta e declara as dimensões corretas de apresentação, 480 × 100 px para todas as composições. Também contém links reais de e-mail, telefone e site. Salvar contato produz vCard; Copiar contatos oferece os dados em texto.

Os GIFs dos modelos com M usam os 10,8 segundos e 20 fps do filme aprovado e repetem três ciclos. O primeiro quadro mantém a composição fixa completa. O recorte do filme é ajustado por escala uniforme e centralizado dentro da área do M, sem esticar seus eixos. Os dados ficam imóveis. A exportação tem progresso e cancelamento e não apaga os campos.

As fontes ficam incorporadas à imagem final. A geometria original é preservada em PNG, GIF, prévia e miniaturas. Clientes que bloqueiam imagens precisam dos contatos em texto; clientes sem animação mostram o primeiro quadro completo.

## Instalação no Gmail

1. Escolher Para e-mail, selecionar uma composição e preencher os dados.
2. Baixar o PNG em tamanho de uso ou o GIF dos modelos com M.
3. No Gmail do computador, abrir Configurações → Ver todas as configurações → Geral → Assinatura.
4. Criar a assinatura e usar Inserir imagem → Fazer upload.
5. Ajustar a imagem proporcionalmente no editor e conferir a leitura. PNG em alta tem o dobro das dimensões do tamanho de uso.
6. Definir a assinatura padrão, salvar e conferir um envio no computador e no celular.

A orientação do Google recomenda imagens de 70 a 100 px de altura para assinaturas. Estes modelos têm 100 px de altura no tamanho de uso; o tamanho de apresentação no cliente de e-mail deve ser conferido, preservando proporção e legibilidade. Não houve acesso à conta do Gmail nem envio de mensagens nesta integração.

Referência: https://support.google.com/mail/answer/11468381?hl=pt-BR .

## Fontes e manutenção

- public/email-compositions.mjs: catálogo, dimensões, campos, validação de encaixe e desenho das quatro composições.
- public/email-card.mjs: recursos nativos, cartão digital, renderização compartilhada, movimento, PNG, GIF, HTML e vCard.
- public/assinatura-email.mjs: seleção, formulário, cores, prévia e exportações.
- public/email-signature.mjs: normalização, validação dos contatos e alternativa em texto.
- public/identidade/email/modelos/: oito miniaturas PNG, em tamanho de uso e 2×, correspondentes às quatro faixas vigentes com Joana.
- public/identidade/M.svg e public/presentation-assets/mattar-published.svg: vetores originais, sem alterações.
- public/motion/videos/m-form.mp4: filme aprovado, sem alterações.
- public/vendor/gifenc/: codificador com versão e licença já fixadas.

A rotina histórica scripts/prepare-email-signature.mjs gera os GIFs pequenos do estudo anterior; ela não define as quatro composições atuais.

## Verificação

Os testes de contrato cobrem dimensões, cores, escape do HTML, vCard e escala uniforme do motion. O smoke de navegador cobre os quatro modelos, comparação com as miniaturas revisadas, nomes longos, PNG normal e 2×, GIF, HTML offline, cartão digital anterior, cores e telas de 320, 390 e 1440 px.
