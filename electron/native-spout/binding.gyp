{
  "targets": [
    {
      "target_name": "spout_sender",
      "conditions": [
        ["OS=='win'", {
          # Requer o Spout2 SDK clonado no host:
          #   git clone https://github.com/leadedge/Spout2 C:\Spout2
          #   set ANNA_SPOUT_SDK=C:/Spout2/SPOUTSDK   (sem espaços no caminho)
          #   npm run rebuild:spout
          "sources": [
            "spout_sender.cc",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutDirectX/SpoutDX/SpoutDX.cpp",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutGL/SpoutSenderNames.cpp",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutGL/SpoutSharedMemory.cpp",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutGL/SpoutFrameCount.cpp",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutGL/SpoutDirectX.cpp",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutGL/SpoutCopy.cpp",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutGL/SpoutUtils.cpp"
          ],
          "include_dirs": [
            "<!@(node -p \"require('node-addon-api').include\")",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutDirectX/SpoutDX",
            "<!(echo %ANNA_SPOUT_SDK%)/SpoutGL"
          ],
          "dependencies": [
            "<!(node -p \"require('node-addon-api').gyp\")"
          ],
          "defines": [
            "NAPI_DISABLE_CPP_EXCEPTIONS",
            "WIN32_LEAN_AND_MEAN",
            "NOMINMAX",
            "_CRT_SECURE_NO_WARNINGS"
          ],
          "libraries": [
            "d3d11.lib",
            "dxgi.lib",
            "advapi32.lib",
            "user32.lib",
            "shell32.lib",
            "version.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": [ "/std:c++17", "/EHsc" ]
            }
          }
        }],
        ["OS!='win'", {
          # Spout é somente Windows — fora dele o alvo compila um stub vazio
          # (o loader index.js já reporta available=false sem tentar carregar).
          "sources": [],
          "type": "none"
        }]
      ]
    }
  ]
}
