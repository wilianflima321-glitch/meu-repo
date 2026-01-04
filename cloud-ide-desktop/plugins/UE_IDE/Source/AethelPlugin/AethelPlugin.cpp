// AethelPlugin.cpp: Plugin C++ para Unreal com integração Aethel
#include "AethelPlugin.h"

#include "Dom/JsonObject.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Misc/ConfigCacheIni.h"
#include "Modules/ModuleManager.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

IMPLEMENT_MODULE(FAethelPluginModule, AethelPlugin);

static FString NormalizeBaseUrl(FString Base)
{
    Base.TrimStartAndEndInline();
    while (Base.EndsWith(TEXT("/")))
    {
        Base.LeftChopInline(1, false);
    }
    return Base;
}

static FString GetAethelApiBase()
{
    // Ordem de precedência:
    // 1) Env var AETHEL_API_BASE
    // 2) Env var NEXT_PUBLIC_API_URL (mesma convenção do web)
    // 3) Config em DefaultEngine.ini: [Aethel] ApiBaseUrl=
    // 4) Fallback local
    FString EnvBase = FPlatformMisc::GetEnvironmentVariable(TEXT("AETHEL_API_BASE"));
    if (EnvBase.IsEmpty())
    {
        EnvBase = FPlatformMisc::GetEnvironmentVariable(TEXT("NEXT_PUBLIC_API_URL"));
    }
    if (!EnvBase.IsEmpty())
    {
        return NormalizeBaseUrl(EnvBase);
    }

    FString IniBase;
    if (GConfig && GConfig->GetString(TEXT("Aethel"), TEXT("ApiBaseUrl"), IniBase, GEngineIni))
    {
        if (!IniBase.IsEmpty())
        {
            return NormalizeBaseUrl(IniBase);
        }
    }

    return TEXT("http://localhost:8000");
}

static FString BuildChatRequestBody()
{
    // Alinha com o formato esperado pelo runtime externo (o web proxy faz POST para `${BASE}/chat`).
    // Mantém um payload mínimo, porém válido/compilável. O backend pode ignorar campos extras.
    TSharedRef<FJsonObject> Root = MakeShared<FJsonObject>();

    TArray<TSharedPtr<FJsonValue>> Messages;
    {
        TSharedRef<FJsonObject> Msg = MakeShared<FJsonObject>();
        Msg->SetStringField(TEXT("role"), TEXT("user"));
        Msg->SetStringField(TEXT("content"), TEXT("Unreal handshake: plugin conectado. Responda OK."));
        Messages.Add(MakeShared<FJsonValueObject>(Msg));
    }
    Root->SetArrayField(TEXT("messages"), Messages);
    Root->SetNumberField(TEXT("maxTokens"), 64);

    FString Out;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Out);
    FJsonSerializer::Serialize(Root, Writer);
    return Out;
}

void FAethelPluginModule::StartupModule()
{
    UE_LOG(LogTemp, Log, TEXT("AethelPlugin: inicializando"));
    ConnectToAethelBackend();
}

void FAethelPluginModule::ShutdownModule()
{
}

void FAethelPluginModule::ConnectToAethelBackend()
{
    const FString BaseUrl = GetAethelApiBase();
    const FString Url = BaseUrl + TEXT("/chat");

    UE_LOG(LogTemp, Log, TEXT("AethelPlugin: conectando em %s"), *Url);

    TSharedRef<IHttpRequest> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(Url);
    Request->SetVerb(TEXT("POST"));
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    Request->SetContentAsString(BuildChatRequestBody());

    Request->OnProcessRequestComplete().BindLambda(
        [](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded)
        {
            if (!bSucceeded || !HttpResponse.IsValid())
            {
                UE_LOG(LogTemp, Error, TEXT("AethelPlugin: falha na requisicao (sem resposta valida)"));
                return;
            }

            const int32 Status = HttpResponse->GetResponseCode();
            const FString Body = HttpResponse->GetContentAsString();
            if (Status >= 200 && Status < 300)
            {
                UE_LOG(LogTemp, Log, TEXT("AethelPlugin: OK (%d): %s"), Status, *Body);
                return;
            }
            UE_LOG(LogTemp, Error, TEXT("AethelPlugin: erro HTTP (%d): %s"), Status, *Body);
        });

    Request->ProcessRequest();
}

void FAethelPluginModule::SimulatePhysicsWithAethel()
{
    UE_LOG(LogTemp, Warning, TEXT("AethelPlugin: SimulatePhysicsWithAethel ainda nao implementado"));
}

void FAethelPluginModule::GenerateShaderWithAethel()
{
    UE_LOG(LogTemp, Warning, TEXT("AethelPlugin: GenerateShaderWithAethel ainda nao implementado"));
}
