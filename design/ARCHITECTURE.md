# LABMATTAR — Arquitetura do sistema de identidade

## Objetivo
A plataforma é o ambiente oficial de consulta, experimentação e produção da identidade. A documentação e as ferramentas devem consumir regras compartilhadas, sem duplicar definições por página.

## Camadas
1. **Fundamentos**: símbolos, tipografia, cores, composição, imagem e movimento. Cada regra apresenta seu estado editorial (aprovada, rascunho ou experimento).
2. **Laboratório**: motor vetorial existente e futuros compositores; experimentos não substituem os fundamentos automaticamente.
3. **Biblioteca**: arquivos oficiais, templates, presets e exportações verificáveis.

## Estrutura implementada
- `design/identity-system.json` — registro canônico inicial de seções, tipografia, paleta e família de símbolos.
- `design/tipografia.html` — matriz tipográfica existente, com animação integrada.
- `design/cores.html` — sistema cromático em elaboração, preservando pontos em avaliação.
- `design/integrate-areas.py` — navegação compartilhada gerada durante o build.
- `design/EditorialAssembly.tsx` — interface do sistema vetorial.
- `/manual.html`, `/tipografia.html`, `/cores.html` — páginas públicas da prévia.

## Sequência de trabalho
**01 — Consolidação técnica**: validar inventário, rastrear divergências e gradualmente substituir valores locais por tokens compartilhados. Não reescrever layouts aprovados.

**02 — Composição**: documentar grid, margens, escala, relações símbolo/título/imagem e responsividade; testar em aplicações reais antes de chamar normas de aprovadas.

**03 — Imagem**: documentar seleção, proporções, enquadramento, tratamento e sequenciamento, inclusive quando não há fotografia.

**04 — Compositor**: definir formato de projeto e prototipar edição ao vivo com assets originais e presets coerentes com os fundamentos.

**05 — Movimento e aplicações**: unificar ritmo e acessibilidade das animações; implementar modelos para suportes específicos e exportadores testáveis.

## Restrições
- Não modificar `labmattar.com` sem autorização.
- Não substituir o motor vetorial enquanto sua geometria estiver pendente de validação.
- Conservar a diagramação e o conteúdo aprovados nas áreas existentes.
- Alteração de regra deve gerar revisão explícita e teste em todos os sistemas.
- O status `draft` ou `experimental` nunca deve ser exibido como norma final.
