// N-API binding pro Spout sender (Windows).
//
// Spout = o "Syphon do Windows": compartilhamento de textura entre apps na
// mesma máquina via DirectX. O Resolume no Windows recebe Spout nativamente.
//
// Caminho (espelha o ndi_sender.cc):
//   JS instancia SpoutSenderNative(name)
//        ↓ spoutDX::OpenDirectX11 + SetSenderName
//   JS chama sendFrame(buf, w, h, stride)   — BGRA top-down do Electron
//        ↓ spoutDX::SendImage (o formato default do SpoutDX é
//          DXGI_FORMAT_B8G8R8A8_UNORM — casa com o BGRA da captura)
//   JS chama destroy() ou GC coleta
//        ↓ ReleaseSender + CloseDirectX11
//
// Compilação: precisa do Spout2 SDK (https://github.com/leadedge/Spout2)
// clonado no host Windows, com a env var ANNA_SPOUT_SDK apontando para a
// pasta SPOUTSDK do repositório. Ver binding.gyp.

#include <napi.h>
#include "SpoutDX.h"

#include <string>

class SpoutSenderNative : public Napi::ObjectWrap<SpoutSenderNative> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "SpoutSenderNative", {
      InstanceMethod("sendFrame", &SpoutSenderNative::SendFrame),
      InstanceMethod("destroy",   &SpoutSenderNative::Destroy),
      InstanceAccessor("name",    &SpoutSenderNative::GetName, nullptr),
    });
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);
    exports.Set("SpoutSenderNative", func);
    return exports;
  }

  SpoutSenderNative(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<SpoutSenderNative>(info), open_(false) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
      Napi::TypeError::New(env, "SpoutSenderNative(name) — name string requerido")
        .ThrowAsJavaScriptException();
      return;
    }
    name_ = info[0].As<Napi::String>().Utf8Value();

    if (!sender_.OpenDirectX11()) {
      Napi::Error::New(env, "spoutDX::OpenDirectX11 falhou (driver DirectX 11?)")
        .ThrowAsJavaScriptException();
      return;
    }
    sender_.SetSenderName(name_.c_str());
    open_ = true;
  }

  ~SpoutSenderNative() {
    DestroyInternal();
  }

private:
  Napi::Value SendFrame(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!open_) return env.Undefined();
    if (info.Length() < 4 ||
        !info[0].IsBuffer() ||
        !info[1].IsNumber() ||
        !info[2].IsNumber() ||
        !info[3].IsNumber()) {
      Napi::TypeError::New(env, "sendFrame(buffer, w, h, strideBytes)")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }
    Napi::Buffer<uint8_t> buf = info[0].As<Napi::Buffer<uint8_t>>();
    int w  = info[1].As<Napi::Number>().Int32Value();
    int h  = info[2].As<Napi::Number>().Int32Value();
    int st = info[3].As<Napi::Number>().Int32Value();

    if (w <= 0 || h <= 0 || st < w * 4) {
      Napi::Error::New(env, "sendFrame: dimensões inválidas")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }
    size_t need = static_cast<size_t>(st) * static_cast<size_t>(h);
    if (buf.Length() < need) {
      Napi::Error::New(env, "sendFrame: buffer menor que stride*h")
        .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    // SendImage espera buffer contíguo (stride == w*4). A captura do
    // Electron entrega exatamente isso; se um dia vier com padding,
    // compacta antes de enviar.
    if (st == w * 4) {
      sender_.SendImage(buf.Data(), static_cast<unsigned int>(w), static_cast<unsigned int>(h));
    } else {
      packed_.resize(static_cast<size_t>(w) * 4 * h);
      const uint8_t* src = buf.Data();
      for (int y = 0; y < h; y++) {
        memcpy(packed_.data() + static_cast<size_t>(y) * w * 4,
               src + static_cast<size_t>(y) * st,
               static_cast<size_t>(w) * 4);
      }
      sender_.SendImage(packed_.data(), static_cast<unsigned int>(w), static_cast<unsigned int>(h));
    }
    return env.Undefined();
  }

  Napi::Value Destroy(const Napi::CallbackInfo& info) {
    DestroyInternal();
    return info.Env().Undefined();
  }

  Napi::Value GetName(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), name_);
  }

  void DestroyInternal() {
    if (open_) {
      sender_.ReleaseSender();
      sender_.CloseDirectX11();
      open_ = false;
    }
    packed_.clear();
    packed_.shrink_to_fit();
  }

  spoutDX sender_;
  bool open_;
  std::string name_;
  std::vector<uint8_t> packed_;
};

// ────── Module init ─────────────────────────────────────────────────────

Napi::Value VersionSpout(const Napi::CallbackInfo& info) {
  return Napi::String::New(info.Env(), "Spout2 / SpoutDX (DirectX 11)");
}

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
  SpoutSenderNative::Init(env, exports);
  exports.Set("version", Napi::Function::New(env, VersionSpout));
  return exports;
}

NODE_API_MODULE(spout_sender, InitModule)
