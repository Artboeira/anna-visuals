# Setup na máquina Windows (app + Resolume juntos)

Guia do zero: o que instalar, onde, e os comandos — em ordem.

---

## 1. O que instalar (em ordem)

### 1.1 Node.js LTS — obrigatório

- Baixar em <https://nodejs.org> → versão **LTS** (22.x), instalador `.msi`.
- Durante a instalação, deixe marcado "Add to PATH".
- Conferir num terminal novo (PowerShell):

```powershell
node -v    # v22.x
npm -v
```

### 1.2 Visual Studio Build Tools — só para Spout/NDI ao vivo

Necessário apenas para compilar os addons nativos (Spout/NDI). Se for testar
só com **vídeos exportados** no Resolume, pule para o §2.

- Baixar **Build Tools for Visual Studio 2022**:
  <https://visualstudio.microsoft.com/downloads/> → "Tools for Visual Studio"
  → Build Tools.
- No instalador, marcar a carga de trabalho
  **"Desenvolvimento para desktop com C++"** (Desktop development with C++).
- Instalar também **Python 3** (o node-gyp usa): <https://python.org> ou
  `winget install Python.Python.3.12` — marcar "Add python.exe to PATH".

### 1.3 Spout2 SDK — para a saída Spout

Clonar em caminho **sem espaços** (o node-gyp quebra com espaços):

```powershell
git clone https://github.com/leadedge/Spout2 C:\Spout2
```

### 1.4 NDI (opcional — só se for usar NDI em vez de Spout)

- Runtime + SDK: <https://ndi.video/for-developers/ndi-sdk/> — instalar o
  **NDI SDK** (o caminho de instalação vai na env var `ANNA_NDI_SDK`, também
  sem espaços; se instalar em caminho com espaços, crie uma junção:
  `mklink /J C:\NDI-SDK "C:\Program Files\NDI\NDI 6 SDK"`).

---

## 2. Clonar e rodar o app

```powershell
git clone <URL_DO_REPO> ANNA_LED_VISUALS
cd ANNA_LED_VISUALS
npm install
```

Notas do `npm install` no Windows:
- `node-syphon` é dependência **opcional** (macOS) — se falhar, o npm segue
  em frente normalmente; ignore o aviso.

Teste rápido no navegador (sem Electron):

```powershell
npm run dev
# abrir http://localhost:5178
```

Se o preview aparecer animando, o núcleo está funcionando. A exportação de
PNG/vídeo (aba SAÍDA) já funciona aqui, direto no navegador.

---

## 3. Compilar o Spout e rodar com saída ao vivo

```powershell
# terminal na pasta do projeto
$env:ANNA_SPOUT_SDK = "C:/Spout2/SPOUTSDK"   # PowerShell (sessão atual)
npm run rebuild:spout
```

> cmd.exe em vez de PowerShell: `set ANNA_SPOUT_SDK=C:/Spout2/SPOUTSDK`
> Para persistir entre sessões: `setx ANNA_SPOUT_SDK "C:/Spout2/SPOUTSDK"`
> (abrir um terminal novo depois do setx).

Se compilar sem erro, rodar o desktop:

```powershell
npm run dev:electron
```

No app:
1. Aba **SAÍDA** → conferir a resolução (6200×512 para o slice oficial, ou
   menor para teste) → nome da fonte `ANNA_LED`.
2. Linha **Spout** → **Iniciar**.
3. Tecla **`O`** (modo saída — o frame limpo que o Resolume recebe).

No Resolume (mesma máquina):
- **Sources → Spout → ANNA_LED**, arrastar para um layer.
- Posicionar o layer sobre o slice "Panel" (rodapé da composição).

Autostart (boot direto com saída ligada):

```powershell
$env:ANNA_AUTOSTART_SPOUT = "ANNA_LED"
npm run dev:electron
```

### NDI como alternativa (mesma máquina, sem compilar Spout)

Instale só o **runtime NDI** e use NDI em localhost — mais simples se o
build do Spout der trabalho no dia. Para compilar o sender NDI:
`$env:ANNA_NDI_SDK = "C:/NDI-SDK"` → `npm run rebuild:ndi`.

---

## 4. Problemas comuns

| Erro | Causa | Solução |
|---|---|---|
| `gyp ERR! find VS` | Build Tools sem a carga C++ | reabrir o instalador do VS e marcar "Desktop development with C++" |
| `gyp ERR! find Python` | Python fora do PATH | reinstalar marcando "Add to PATH", abrir terminal novo |
| `Cannot open include file 'SpoutDX.h'` | `ANNA_SPOUT_SDK` não definida ou errada | apontar para a pasta `SPOUTSDK` do clone (com as subpastas `SpoutDirectX` e `SpoutGL`) |
| erros com `%ANNA_SPOUT_SDK%` literal | env var só existe na sessão onde foi `set` | definir no MESMO terminal que roda o rebuild, ou usar `setx` + terminal novo |
| Spout "indisponível" no app | addon não compilado | `npm run rebuild:spout` e reiniciar o `dev:electron` |
| Fonte não aparece no Resolume | modo saída não ativo / janela minimizada | tecla `O`, janela visível (a captura segue a janela) |
| Porta 5178 ocupada | outro vite rodando | fechar o outro processo ou `ANNA_DEV_URL` |

---

## 5. Resumo mínimo (copy-paste)

```powershell
# instalar Node LTS + VS Build Tools (C++) + Python antes

git clone <URL_DO_REPO> ANNA_LED_VISUALS
cd ANNA_LED_VISUALS
npm install

git clone https://github.com/leadedge/Spout2 C:\Spout2
$env:ANNA_SPOUT_SDK = "C:/Spout2/SPOUTSDK"
npm run rebuild:spout

npm run dev:electron
# SAÍDA → Spout → Iniciar → tecla O → Resolume: Sources → Spout → ANNA_LED
```
