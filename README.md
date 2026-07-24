# ANNA — LED Visuals

Sistema de visuais em tempo real para o painel de LED do show da ANNA.
Painel físico: **27,00 × 2,70 m (10:1)**, atrás de cenografia de 29 painéis de
MDF branco (0,925 × 2,70 m) com corte vazado tipo **cobogó** — grade xadrez
alternando octógonos e o glifo/monograma da ANNA (referências em `refs/`).

Núcleo de render, presets e pipeline NDI/Syphon reaproveitados do
**gradient_system** (snapshot copiado em 2026-07-20); filosofia visual
("zero preto", anti-sincronismo por golden ratio, animação time-based)
herdada do **t_system**.

> **Manual de operação completo**: [GUIA_OPERACAO.md](GUIA_OPERACAO.md) —
> fluxos da MESA, cenas, presets, checklist do dia do show e troubleshooting.

## Rodar

```bash
npm install
npm run dev            # navegador em http://localhost:5178
npm run dev:electron   # wrapper desktop com saída NDI/Syphon
npm run build          # build de produção (dist/)
```

## MESA (aba padrão) — operação A/B

O deck **A** é o look vivo (o que está no LED); o deck **B** é um look
preparado. O **crossfader** mistura os dois em tempo real (cada deck renderiza
com sua própria cena, params e paleta); **A⇄B** troca os decks sem pulo visual.
Abaixo dos decks, tudo que compõe um preset fica visível de uma vez:
parâmetros da cena **agrupados por tipo** (MOVIMENTO / COR / FORMA / BEAT /
NÍVEL — mesmo vocabulário em todas as cenas), paleta, master, transição e
salvar. Fluxo típico: monta o look em A → salva como preset → `1–9` carrega
outro preset no B → fader → `X` para consolidar.

## Atalhos

| Tecla | Ação |
|---|---|
| `Espaço` | tocar / pausar |
| `P` | modo palco — preview limpo em tela cheia (10:1 com cobogó, sem painel) |
| `O` | modo saída — frame cru esticado na janela (captura do Electron p/ LED) |
| `Esc` | sai do modo palco/saída |
| `M` | simulação do cobogó no preview |
| `G` | ghost de calibração (LED_LAYOUT sobreposto) |
| `T` | tap tempo |
| `F` (segurar) | flash quente no beat |
| `1–9` | carregar preset no **deck B** (prepara o mix) |
| `Shift+1–9` | aplicar preset direto no look vivo (com transição) |
| `[` / `]` | crossfader A↔B |
| `X` | trocar A⇄B |

Deep-links para tape-machine/verificação:
`?scene=<id>` · `?present=1` · `?mask=0` · `?ghost=1`

## Arquitetura

```
src/
├── core/      prng (mulberry32) · colorUtils (chroma, cache) · timing (BPM, PHI)
├── grid/      grade procedural do cobogó (types, cobogoGrid, glyphPath, maskOverlay)
├── scenes/    contrato SceneDef + registry + 8 cenas
├── engine/    RenderEngine — canvas interno 10:1, crossfade/slide, piso zero-preto
├── store/     showStore (zustand) · paletas curadas · presets (localStorage + JSON)
├── components/ PreviewStage (letterbox + máscara + ghost) · ControlPanel (Estúdio AB)
└── hooks/     useRenderLoop (rAF) · useKeyboard
```

- **Resolução interna** default 2700×270 (1 px/cm; célula = 54 px), reconfigurável
  na aba SAÍDA quando a produtora confirmar o pixel map. Cenas são
  resolution-independent; a grade é re-gerada por resolução.
- **Cenas grid-aware** (Twinkle, Onda, Glifos ANNA) desenham célula a célula
  usando a mesma geometria do overlay — alinhamento garantido por construção.
- **Mix A/B**: o engine mantém uma instância de cena por deck e compõe pelo
  fader; a troca A⇄B promove as instâncias sem transição (o visual não pula).
- **Grupos de parâmetro**: cada `ParamSpec` leva `group`
  (movimento/cor/forma/beat/nivel) — a UI agrupada é gerada disso.
- **Zero preto**: o engine assenta o stop mais escuro da paleta sob toda cena;
  o cobogó nunca apaga por completo (exceto pelo dimmer master, operacional).
- **Strobe** com safety cap ≤ 8 Hz (fotossensibilidade).
- **Presets** = cena + params + paleta embutida + master + BPM; export/import
  JSON (`anna-led/1.0`) leva também a calibração da grade.

### Adicionar uma cena

Crie `src/scenes/minhaCena.ts` implementando `SceneDef` (ver `scenes/types.ts`)
e registre em `scenes/registry.ts`. A UI de parâmetros é gerada do
`paramsSchema` automaticamente.

### Calibrar a máscara

Aba **GRADE** → ligar o ghost (`G`) → ajustar linhas/colunas/margens/chanfro/
glifo até a grade cobrir o padrão do `LED_LAYOUT.jpeg`. A calibração persiste
em localStorage e sai no JSON exportado. Se o corte real vier como SVG/DXF,
substitua as funções de `grid/glyphPath.ts` por `new Path2D(svgPath)` —
nenhum outro módulo muda.

## Saída para o LED (dia do show) — duas janelas

O Electron usa **janela de saída dedicada**: ao iniciar NDI/Syphon/Spout, uma
janela pequena (`?output=1`, no tamanho da resolução configurada) abre e é
**dela** que os frames são capturados. A janela de controle fica livre para
operar a MESA ao vivo; o estado sincroniza via BroadcastChannel e o beat usa
relógio de parede (as duas janelas batem no mesmo tempo musical).

Por que: capturar a janela de controle (retina, ~23 MB/frame) gerava churn de
memória de GB/s — em teste derrubou a máquina. A janela dedicada custa ~5 MB
por frame e o consumo fica limitado (~0,5–1 GB medido em soak com Syphon).

1. `npm run dev:electron` (ou o app empacotado `npm run build:mac`).
2. Aba **SAÍDA** → resolução do pixel map → **Iniciar** Syphon (macOS local),
   Spout (Windows local) ou NDI (rede) — a janela de saída abre sozinha.
3. Operar normalmente pela janela de controle (MESA, presets, fader).
4. Autostart tape-machine: `ANNA_AUTOSTART_SYPHON=ANNA_LED` /
   `ANNA_AUTOSTART_NDI=...` / `ANNA_AUTOSTART_SPOUT=...`.
5. Captura limitada a 30 fps por padrão (`ANNA_CAPTURE_FPS=60` para subir);
   log `[mem]` no terminal mostra o consumo a cada 10 s.

O modo saída da própria janela (tecla `O`) segue existindo para uso sem
Electron (browser puro).

### NDI — dependência nativa

O addon NDI requer o **NDI Advanced SDK** instalado. O gyp quebra com espaços
no caminho — crie um symlink e recompile:

```bash
sudo ln -s "/Library/NDI Advanced SDK for Apple" /Library/NDI-SDK
npm run rebuild:ndi
```

Sem o SDK, o NDI aparece como "indisponível" e o **Syphon segue funcionando**
(instalado via npm, já testado nesta máquina).

### Setup em outro Mac (app + Resolume na mesma máquina → Syphon)

```bash
xcode-select --install        # Command Line Tools (compila o node-syphon)
# Node.js LTS 22.x: https://nodejs.org (ou brew install node@22)

git clone https://github.com/Artboeira/anna-visuals.git ANNA_LED_VISUALS
cd ANNA_LED_VISUALS
npm install                   # node-syphon compila aqui — precisa do CLT acima
npm run dev:electron
```

No app: aba SAÍDA → **Syphon · Iniciar** → tecla `O` (modo saída).
No Resolume: **Sources → Syphon → ANNA_LED**. NDI não é necessário nesse
cenário local (só se for mandar pela rede).

### Windows — Spout (app + Resolume na mesma máquina)

Spout é o equivalente do Syphon no Windows; o Resolume recebe nativamente.
O sender está em `electron/native-spout` (SpoutDX / DirectX 11). Para
compilar na máquina Windows (requer Visual Studio Build Tools + Python,
a toolchain padrão do node-gyp):

```bat
git clone https://github.com/leadedge/Spout2 C:\Spout2
set ANNA_SPOUT_SDK=C:/Spout2/SPOUTSDK
npm run rebuild:spout
```

Depois: `npm run dev:electron` → aba SAÍDA → **Spout · Iniciar** → no
Resolume, Sources → Spout → `ANNA_LED`. Autostart:
`ANNA_AUTOSTART_SPOUT=ANNA_LED`. Sem o build, a linha Spout aparece como
"indisponível" com o motivo — nada quebra (e o NDI em localhost funciona
como alternativa imediata na mesma máquina).

## Exportar vídeo/imagem para teste no Resolume

O mapa oficial está em `refs/Ame_withpanel.xml` (Arena 7): composição
**6200×4600**, screen "Panel" com slice lendo **6200×512** no rodapé
(y 4088–4600); o resto da composição alimenta os lumiverses DMX do teto.

Aba **SAÍDA → Exportar**:
- **Alvo**: `Slice 6200×512` (arquivo para um layer cobrindo o rodapé) ou
  `Comp 6200×4600` (composição inteira, faixa já posicionada, teto preto).
- **PNG** — frame atual, pixel-true (a resolução interna é trocada para o
  alvo durante o render e restaurada).
- **Vídeo** — MediaRecorder com duração/fps configuráveis. Acima de 4032 px
  de largura sai **WebM/VP9**; se o Resolume não abrir direto, converter para
  DXV no Resolume Alley ou
  `ffmpeg -i clip.webm -c:v prores_ks -pix_fmt yuv422p clip.mov`.
- Manter a aba do navegador visível durante a gravação (rAF pausa em aba oculta).

## Pendências conhecidas

- Corte real do cobogó (medidas/DXF): recalibrar a grade contra o ghost.
- Se a janela Electron não puder ter 2700 px de largura (limite da tela),
  capturar em 1920×192 e escalar no Resolume — o cobogó perdoa.
