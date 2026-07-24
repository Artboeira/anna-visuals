{
  "targets": [
    {
      "target_name": "ndi_sender",
      "sources": [ "ndi_sender.cc" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "cflags": [ "-fexceptions" ],
      "cflags_cc": [ "-fexceptions" ],

      # NDI SDK lookup: por OS. Pode ser sobrescrito via env ANNA_NDI_SDK.
      # ATENÇÃO: gyp quebra com espaços em include_dirs — se o SDK estiver em
      # "/Library/NDI Advanced SDK for Apple", crie um symlink sem espaços:
      #   sudo ln -s "/Library/NDI Advanced SDK for Apple" /Library/NDI-SDK
      #   ANNA_NDI_SDK=/Library/NDI-SDK npm run rebuild:ndi
      "conditions": [
        ["OS=='mac'", {
          "include_dirs+": [
            "<!(echo \"${ANNA_NDI_SDK:-/Library/NDI-SDK}/include\")"
          ],
          "libraries": [
            "<!(echo \"${ANNA_NDI_SDK:-/Library/NDI-SDK}/lib/macOS/libndi_advanced.dylib\")"
          ],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17"
          }
        }],
        ["OS=='linux'", {
          "include_dirs+": [
            "<!(echo \"${ANNA_NDI_SDK_INCLUDE:-${HOME}/.local/include/ndi}\")"
          ],
          "libraries": [
            "-L<!(echo \"${ANNA_NDI_SDK_LIB:-${HOME}/.local/lib}\")",
            "-lndi",
            "-Wl,-rpath,<!(echo \"${ANNA_NDI_SDK_LIB:-${HOME}/.local/lib}\")"
          ],
          "cflags_cc+": [ "-std=c++17" ]
        }],
        ["OS=='win'", {
          "include_dirs+": [
            "<!(echo \"%ANNA_NDI_SDK%\\Include\")"
          ],
          "libraries": [
            "<!(echo \"%ANNA_NDI_SDK%\\Lib\\x64\\Processing.NDI.Lib.x64.lib\")"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": [ "/std:c++17" ]
            }
          }
        }]
      ]
    }
  ]
}
