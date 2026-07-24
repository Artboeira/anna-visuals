# ANNA LED Visuals — Guia de Operação

Manual de operação do sistema de visuais do show da ANNA.
Painel de LED 27,00 × 2,70 m atrás de cenografia de cobogó (29 painéis de MDF
com corte vazado: octógonos + monograma ANNA).

---

## 1. Como o sistema funciona (mapa mental)

```
cenas (código) ──► RenderEngine ──► canvas interno 2700×270 (10:1)
                       │
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
   PREVIEW (edição)  PALCO (P)        SAÍDA (O)
   letterbox +       tela cheia +     frame cru esticado
   cobogó simulado   cobogó simulado  na janela
                                          │ (só no Electron)
                                          ▼
                              captura BGRA → NDI / Syphon
                                          ▼
                              Resolume → processadora → LED
```

Três ideias regem tudo:

1. **Um look = cena + parâmetros + paleta.** É a unidade que você salva
   (preset), prepara (deck B) e mistura (crossfader).
2. **Zero preto.** O escuro é sempre cor saturada profunda — o stop mais
   escuro da paleta. O cobogó nunca "apaga" (a cenografia continua viva).
   A única exceção é o dimmer master, que é operacional.
3. **A grade é a cenografia.** As cenas "grade" animam célula a célula
   exatamente onde os furos do cobogó estão — o LED vira a própria
   cenografia acendendo.

---

## 2. Ligando

```bash
cd ANNA_LED_VISUALS
npm run dev            # ensaio no navegador → http://localhost:5178
npm run dev:electron   # dia do show (com saída NDI/Syphon)
```

A tela abre no modo edição: preview em cima do palco escuro à esquerda,
painel de controle à direita, aba **MESA** ativa.

Tudo persiste sozinho no navegador (presets, paletas custom, calibração da
grade, BPM, última cena) — fechar e reabrir recupera o estado.

---

## 3. Os três modos de tela

| Modo | Tecla | O que mostra | Para quê |
|---|---|---|---|
| **Edição** | (padrão) | preview letterbox + painel | montar looks, calibrar, ensaiar |
| **Palco** | `P` (sai com `P`/`Esc`) | faixa 10:1 em tela cheia, com cobogó, sem UI | visualizar como vai ler no evento; bom para mostrar pro cliente |
| **Saída** | `O` (sai com `O`/`Esc`) | frame cru esticado na janela | **somente para a captura do Electron** — a janela é dimensionada para o pixel map, então aqui o "esticado" é o tamanho certo do LED |

No preview e no palco, `M` liga/desliga a simulação do cobogó e `G` liga o
ghost de calibração.

---

## 4. Header (sempre visível)

- **TOCAR / PAUSAR** (`Espaço`) — congela/retoma o relógio das cenas.
- **BPM** — digite direto, ou:
- **TAP** (`T`) — bata no tempo da música 4+ vezes; o BPM é a média dos
  últimos taps. Tudo que é "sync com BPM" (varredura, eco radial, strobe,
  glifos em modo beat, flash) segue esse relógio.

---

## 5. MESA — a superfície de operação

A aba MESA (painel largo) é onde o show acontece. Conceito:

- **Deck A = look vivo.** É o que está no LED **e é o que você edita** —
  todos os parâmetros, paleta e master da MESA mexem no A.
- **Deck B = look preparado.** Um preset carregado, esperando. Não é
  editável — é um snapshot.
- **Crossfader** — mistura A (esquerda) e B (direita) em tempo real. Cada
  deck renderiza com sua própria cena E paleta, então dá para fundir, por
  exemplo, um gradiente âmbar com um twinkle vinho.

### 5.1 Fluxo básico de show

1. Look tocando no A.
2. `3` (tecla) → preset 3 carrega no **deck B** (nada muda no LED ainda).
3. No momento certo, arrasta o fader A→B (ou `]` repetidamente, ou
   **CORTE SECO** para virada instantânea no drop).
4. Com o fader em B, aperte **`X` (A⇄B)**: o B vira o look vivo (editável),
   o antigo A fica guardado no B, o fader volta para A — **sem pulo visual**.
5. Repete: carrega o próximo preset no B, e assim vai.

> Regra de ouro: **termine sempre com `X`**. Se você deixar o fader no meio
> ou em B sem trocar, o que você edita (A) não é o que está mais visível.
> O deck com borda **âmbar** é o que domina o LED naquele momento.

### 5.2 Outros movimentos

- **ATUAL → B** — copia o look vivo para o B. Use para criar variações:
  copia, mexe no A (outra paleta, outra velocidade), e compara A/B com o
  fader. Ótimo para decidir entre duas versões de um look.
- **CORTE SECO** — fader pula para o lado oposto. Virada instantânea.
- **LIMPAR B** — esvazia o deck B.
- **Fader no meio** — vale como estado estético: duas cenas sobrepostas
  (B entra por cima com transparência). Um twinkle a 30% sobre um gradiente
  é uma textura nova.

### 5.3 Montando um look (parte de baixo da MESA)

Tudo que compõe um preset está visível de uma vez:

- **Parâmetros da cena**, agrupados por tipo (ver §7).
- **Paleta** — chips clicáveis (a troca é imediata no look vivo).
- **Master** — brightness (dimmer), velocidade global, transição.
- **Salvar look como preset** — dá nome e salva; o preset captura cena +
  parâmetros + paleta + master + BPM, com thumbnail do frame atual.

### 5.4 Banco de presets

- **Clique** no card → carrega no **deck B**.
- **Shift+clique** → aplica direto no look vivo, com a transição automática
  (crossfade/slide conforme configurado).
- Os **9 primeiros** têm número âmbar — são as teclas `1–9`.
- A **ordem** do banco é a ordem de criação. Monte os presets na ordem do
  set para os números fazerem sentido no escuro.

---

## 6. As 8 cenas — o que são e quando usar

| Cena | Tipo | Caráter | Momento típico |
|---|---|---|---|
| **Sólido / Respiração** | livre | chapa de cor quente pulsando devagar | warm-up, entre momentos, "respiro" |
| **Gradiente / Deriva** | livre | gradiente lento atravessando os 27 m | base contínua, groove constante |
| **Varredura** | livre | barra de luz cruzando o painel (com halo) | build-up, marcar frases — sync por compasso |
| **Eco Radial** | livre | anéis concêntricos pulsando do centro | eco do lustre; momentos hipnóticos; drop com pulso por compasso |
| **Twinkle (grade)** | grade | células acendendo individualmente | textura viva; lê como o render oficial do palco |
| **Onda (grade)** | grade | onda percorrendo as células | groove visual; contraste glifo/octógono dá duas vozes |
| **Glifos ANNA** | grade | monograma da ANNA pulsando em destaque | momento de identidade — entrada da DJ, drop de música dela |
| **Pulse / Strobe** | livre | flash por BPM com decay | picos de energia (cap de segurança: ≤ 8 Hz) |

Dicas de combinação com o fader no meio:
- Gradiente (A) + Twinkle (B a ~40%) = fundo em movimento com brilhos.
- Sólido (A) + Glifos ANNA (B a ~60%) = branding sutil sobre respiração.
- Eco Radial (A) + Strobe (B, corte seco no drop) = impacto.

---

## 7. Grupos de parâmetros — o vocabulário

Toda cena expõe seus parâmetros nos mesmos 5 grupos (headers âmbar):

| Grupo | O que controla | Exemplos |
|---|---|---|
| **MOVIMENTO** | velocidade, período, direção, modo de animação | travessias/min, células/s, decaimento |
| **COR** | onde a cena amostra a paleta | posição na paleta, abertura, contraste glifo/octógono, cor do fundo |
| **FORMA** | geometria | barras, anéis, comprimento de onda, centro, largura, suavidade |
| **BEAT** | relação com o BPM | sync on/off, pulsos por compasso, subdivisão |
| **NÍVEL** | intensidades | nível da base, densidade, nível mínimo |

Como quase todo parâmetro de cor é uma **posição na paleta (0–1)** e não uma
cor fixa, trocar a paleta re-tematiza qualquer cena sem mexer em mais nada —
0 é o extremo escuro, 1 o extremo claro.

---

## 8. Cor e paletas

- **Âmbar / Núcleo** (Âmbar Lustre, Ember, Cobre, Cortina) — o coração do
  show, amostrado dos renders. Padrão: Âmbar Lustre.
- **Brasa** (Vermelho Profundo, Rosa Quente, Vinho & Dourado, Garnet) —
  vermelhos e rosas para variar a temperatura sem sair do quente.
- **Acentos** (Azul-Noite, Verde Profundo) — contraste; use com parcimônia
  (um momento, não um bloco).
- **Custom**: selecione uma paleta próxima → **Duplicar como custom** (aba
  COR) → edite os stops (clique na barra adiciona stop; arraste move; clique
  no stop abre o picker). Mantenha o stop mais escuro **com matiz** — nunca
  #000 — para o cobogó não apagar.

---

## 9. Presets — construir o set

1. Monte o look na MESA (cena → parâmetros → paleta → master).
2. Avalie no **modo palco** (`P`) com o cobogó ligado — é ali que se decide.
3. Salve com nome que funcione no escuro: `01 warmup ambar`,
   `05 drop glifos`, `09 strobe final`.
4. Salve **na ordem do set** — a ordem vira as teclas 1–9.
5. **PRESETS → Exportar JSON** ao fim de cada sessão de montagem. O arquivo
   leva presets + calibração da grade e restaura tudo em qualquer máquina
   (Importar JSON). É o seu backup do show — guarde fora da máquina também.

---

## 10. Grade / calibração do cobogó

Só é preciso mexer quando houver informação nova da cenografia:

1. Aba **GRADE** → ligue o **ghost** (`G`) — o desenho técnico real aparece
   sobreposto ao preview.
2. Ajuste até a grade procedural cobrir o padrão: linhas/colunas → margens →
   respiros → chanfro do octógono → glifo (escala e posição vertical — a
   geometria é a do símbolo oficial ANNA 2026, fixa).
3. A calibração persiste sozinha e sai no JSON exportado.

Se o corte final vier em SVG/DXF, a troca é em `src/grid/glyphPath.ts`
(nenhuma cena muda). Quando a produtora confirmar o **pixel map**, ajuste a
resolução na aba SAÍDA — as cenas são independentes de resolução.

---

## 11. Dia do show — checklist

### Antes (na semana)

- [ ] Instalar o NDI Advanced SDK na máquina do show (se a saída for NDI):
      `sudo ln -s "/Library/NDI Advanced SDK for Apple" /Library/NDI-SDK`
      e `npm run rebuild:ndi`. **Testar dias antes, nunca na passagem de som.**
- [ ] Importar o JSON do show na máquina do show.
- [ ] Confirmar pixel map com a produtora → aba SAÍDA → resolução.

### Na passagem de som

1. `npm run dev:electron`
2. Aba **SAÍDA** → conferir resolução → nome da fonte `ANNA_LED` →
   **Iniciar** Syphon (Resolume na mesma máquina) ou NDI (rede).
3. Tecla **`O`** (modo saída) — a janela vira o frame limpo.
4. No Resolume: adicionar a fonte Syphon/NDI `ANNA_LED`, mapear no output.
5. Testar: trocar presets, fader, flash — conferir latência e cor no LED real.
6. Ajustar **brightness master** ao ambiente (o LED atrás do MDF pode pedir
   mais ou menos do que o preview sugere).

### Durante

- Opere pela MESA (segunda tela) enquanto a janela de saída fica no `O`.
- `1–9` → B → fader → `X`. `F` segurado para flashes. `T` para re-sincronizar
  o BPM quando a música virar.
- **"Blackout" quente**: brightness master a zero *ou* um preset
  Sólido/Respiração na posição mais escura da paleta (mantém o cobogó vivo —
  preferível esteticamente).
- Autostart (se a máquina reiniciar): env vars `ANNA_AUTOSTART_NDI=ANNA_LED`
  ou `ANNA_AUTOSTART_SYPHON=ANNA_LED`.

---

## 12. Atalhos — referência completa

| Tecla | Ação |
|---|---|
| `Espaço` | tocar / pausar |
| `P` | modo palco (preview limpo, 10:1 com cobogó) |
| `O` | modo saída (frame cru p/ captura do Electron) |
| `Esc` | sai do palco/saída |
| `M` | liga/desliga simulação do cobogó |
| `G` | liga/desliga ghost de calibração |
| `T` | tap tempo |
| `F` (segurar) | flash quente pulsando no beat |
| `1–9` | carrega preset N no **deck B** |
| `Shift+1–9` | aplica preset N direto no look vivo (com transição) |
| `[` / `]` | crossfader para A / para B |
| `X` | troca A⇄B (sem pulo visual) |

Deep-links (útil para atalhos de navegador/tape-machine):
`?scene=<id>` · `?clean=1` (palco) · `?present=1` (saída) · `?mask=0` · `?ghost=1`

---

## 13. Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Editei parâmetro e nada muda no LED | fader está em B — você edita o A | `X` para trocar, ou fader de volta a A |
| Tecla não responde | foco num campo de texto | clique fora do campo |
| NDI "indisponível" | SDK não instalado / addon não compilado | ver §11; Syphon funciona sem nada |
| Frame NDI com UI junto | esqueceu o modo saída | tecla `O` |
| Cena grid desalinhada do cobogó real | calibração | aba GRADE + ghost (§10) |
| Strobe mais lento que o pedido | cap de segurança 8 Hz | é intencional (fotossensibilidade) |
| Tudo lento | outra aba/app pesado na máquina | máquina do show dedicada; fps na aba SAÍDA → 30 se preciso |
| Preview preto ao abrir | porta 5178 ocupada por outro vite | fechar o outro projeto ou `ANNA_DEV_URL` |

---

## 14. Roteiro de exemplo (set de 9 presets)

| # | Preset | Cena | Paleta | Papel |
|---|---|---|---|---|
| 1 | warmup respiração | Sólido/Respiração | Âmbar Lustre | abertura, casa enchendo |
| 2 | deriva cobre | Gradiente/Deriva | Cobre | groove de base |
| 3 | twinkle brasa | Twinkle | Ember | textura viva |
| 4 | onda vinho | Onda (grade) | Vinho & Dourado | groove com duas vozes |
| 5 | glifos anna | Glifos ANNA (beat) | Âmbar Lustre | entrada da ANNA / identidade |
| 6 | varredura build | Varredura (sync 1 compasso) | Rosa Quente | build-up |
| 7 | eco drop | Eco Radial (pulso/compasso) | Garnet | drop hipnótico |
| 8 | strobe pico | Pulse/Strobe 1/2 | Âmbar Lustre | pico de energia |
| 9 | azul respiro | Sólido/Respiração | Azul-Noite | contraste, quebra de temperatura |

Operação: `2` no B → fade lento → `X` → ... → no drop: `7` no B → **corte
seco** → `X` → `F` segurado nos primeiros compassos.
