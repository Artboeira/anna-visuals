// N-API binding pro NDI sender.
//
// Por que existe: em maio/2026 não há package npm Node maduro com NDI
// sender funcional. `grandiose` só recebe; `ndi.js` é WIP sem exemplos.
// Este binding implementa o caminho direto:
//
//   JS instancia NDISenderNative(name)
//        ↓ NDIlib_send_create
//   JS chama sendFrame(buf, w, h, stride)
//        ↓ NDIlib_send_send_video_async_v2  (não bloqueia thread Node)
//   JS chama destroy() ou GC coleta
//        ↓ NDIlib_send_destroy
//
// Async send: o NDI SDK promete que send_video_async_v2 retorna imediato
// e a buffer só pode ser reutilizada após o PRÓXIMO send. Aqui mantemos
// uma cópia interna do buffer pra desacoplar do ciclo de vida do
// ArrayBuffer JS (pode ser GC entre frames).
//
// FourCC: o renderer Electron entrega BGRA top-down (toBitmap default em
// Mac/Win/Linux). Usamos NDIlib_FourCC_video_type_BGRA direto.

#include <napi.h>
#include <Processing.NDI.Lib.h>

#include <cstring>
#include <string>
#include <vector>

class NDISenderNative : public Napi::ObjectWrap<NDISenderNative> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "NDISenderNative", {
      InstanceMethod("sendFrame", &NDISenderNative::SendFrame),
      InstanceMethod("destroy",   &NDISenderNative::Destroy),
      InstanceAccessor("name",    &NDISenderNative::GetName, nullptr),
    });
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);
    exports.Set("NDISenderNative", func);
    return exports;
  }

  NDISenderNative(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<NDISenderNative>(info), instance_(nullptr) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
      Napi::TypeError::New(env, "NDISenderNative(name) — name string requerido")
        .ThrowAsJavaScriptException();
      return;
    }
    name_ = info[0].As<Napi::String>().Utf8Value();

    NDIlib_send_create_t create = {};
    create.p_ndi_name = name_.c_str();
    create.p_groups = nullptr;
    create.clock_video = false;  // não bloqueia se renderer atrasar
    create.clock_audio = false;

    instance_ = NDIlib_send_create(&create);
    if (!instance_) {
      Napi::Error::New(env, "NDIlib_send_create falhou. NDI runtime instalado?")
        .ThrowAsJavaScriptException();
      return;
    }
  }

  ~NDISenderNative() {
    DestroyInternal();
  }

private:
  Napi::Value SendFrame(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!instance_) return env.Undefined();
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

    // Double-buffer: NDI async_v2 mantém referência ao buffer ATÉ o próximo
    // send. Mantemos duas cópias rotativas pra que o SDK sempre tenha um
    // buffer válido sem precisar segurar o ArrayBuffer JS contra o GC.
    std::vector<uint8_t>& target =
      (active_buffer_ == 0) ? buffer_b_ : buffer_a_;
    target.assign(buf.Data(), buf.Data() + need);
    active_buffer_ = 1 - active_buffer_;

    NDIlib_video_frame_v2_t frame = {};
    frame.xres = w;
    frame.yres = h;
    frame.FourCC = NDIlib_FourCC_video_type_BGRA;
    frame.frame_rate_N = 60000;
    frame.frame_rate_D = 1000;
    frame.picture_aspect_ratio = 0.0f;  // square pixels
    frame.frame_format_type = NDIlib_frame_format_type_progressive;
    frame.timecode = NDIlib_send_timecode_synthesize;
    frame.p_data = target.data();
    frame.line_stride_in_bytes = st;
    frame.p_metadata = nullptr;

    NDIlib_send_send_video_async_v2(instance_, &frame);
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
    if (instance_) {
      // "Flush" oficial: enviar frame com p_data=nullptr garante que o último
      // async buffer pode ser liberado em segurança.
      NDIlib_video_frame_v2_t flush = {};
      NDIlib_send_send_video_async_v2(instance_, &flush);
      NDIlib_send_destroy(instance_);
      instance_ = nullptr;
    }
    buffer_a_.clear();
    buffer_a_.shrink_to_fit();
    buffer_b_.clear();
    buffer_b_.shrink_to_fit();
  }

  NDIlib_send_instance_t instance_;
  std::string name_;
  std::vector<uint8_t> buffer_a_;
  std::vector<uint8_t> buffer_b_;
  int active_buffer_ = 0;
};

// ────── Module-level functions ──────────────────────────────────────────

Napi::Value InitializeNDI(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  bool ok = NDIlib_initialize();
  return Napi::Boolean::New(env, ok);
}

Napi::Value DestroyNDI(const Napi::CallbackInfo& info) {
  NDIlib_destroy();
  return info.Env().Undefined();
}

Napi::Value VersionNDI(const Napi::CallbackInfo& info) {
  const char* v = NDIlib_version();
  return Napi::String::New(info.Env(), v ? v : "unknown");
}

// ────── Module init ─────────────────────────────────────────────────────

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
  NDISenderNative::Init(env, exports);
  exports.Set("initialize", Napi::Function::New(env, InitializeNDI));
  exports.Set("destroy",    Napi::Function::New(env, DestroyNDI));
  exports.Set("version",    Napi::Function::New(env, VersionNDI));
  return exports;
}

NODE_API_MODULE(ndi_sender, InitModule)
