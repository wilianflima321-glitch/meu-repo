// AethelPlugin.cpp: Plugin C++ para Unreal com integração Aethel IA
#include 'AethelPlugin.h'
#include 'Modules/ModuleManager.h'
#include 'HttpModule.h'
#include 'Interfaces/IHttpRequest.h'
#include 'Interfaces/IHttpResponse.h'
#include 'PhysicsEngine/PhysXSupport.h'  // PhysX
#include 'RHI.h'  // Para shaders

IMPLEMENT_MODULE(FAethelPluginModule, AethelPlugin);

void FAethelPluginModule::StartupModule()
{
    // Inicializa integração com Aethel IA
    UE_LOG(LogTemp, Warning, TEXT('Aethel Plugin Started - Conectando ao Backend...'));
    // Conecta ao backend via HTTP (ex.: gerar código Unreal)
    ConnectToAethelBackend();
}

void FAethelPluginModule::ShutdownModule()
{
    // Limpa
}

static FString GetAethelApiBase()
{
    // Try environment variables commonly used in this repo
    FString EnvBase = FPlatformMisc::GetEnvironmentVariable(TEXT("AETHEL_API_BASE"));
    if (EnvBase.IsEmpty()) {
        EnvBase = FPlatformMisc::GetEnvironmentVariable(TEXT("NEXT_PUBLIC_API_URL"));
    }
    if (EnvBase.IsEmpty()) {
        EnvBase = TEXT("http://localhost:8000");
    }
    // Trim trailing slash
    if (EnvBase.EndsWith(TEXT("/"))) {
        EnvBase.LeftChopInline(1, false);
    }
    return EnvBase;
}

void FAethelPluginModule::ConnectToAethelBackend()
{
    // Exemplo: HTTP request para gerar código
    TSharedRef<IHttpRequest> Request = FHttpModule::Get().CreateRequest();
    const FString Url = GetAethelApiBase() + TEXT("/aethel/generate-unreal-code");
    Request->SetURL(Url); // URL backend
    Request->SetVerb(TEXT('POST'));
    Request->SetHeader(TEXT('Content-Type'), TEXT('application/json'));
    Request->SetContentAsString(TEXT('{\'prompt\': \'Generate a simple actor\'}'));
    Request->OnProcessRequestComplete().BindLambda([](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded) {
        if (bSucceeded && HttpResponse.IsValid())
        {
            UE_LOG(LogTemp, Log, TEXT('Resposta Aethel: %s'), *HttpResponse->GetContentAsString());
        }
    });
    Request->ProcessRequest();
}

void FAethelPluginModule::SimulatePhysicsWithAethel()
{
    // Simulação física com PhysX integrada a Aethel
    // Ex.: Envia dados físicos para Aethel otimizar
    UE_LOG(LogTemp, Log, TEXT('Simulando física com Aethel...'));
    // TODO: Conectar a backend para otimização IA
}

void FAethelPluginModule::GenerateShaderWithAethel()
{
    // Gera shader HLSL via Aethel
    TSharedRef<IHttpRequest> Request = FHttpModule::Get().CreateRequest();
    const FString Url = GetAethelApiBase() + TEXT("/aethel/generate-shader");
    Request->SetURL(Url);
    Request->SetVerb(TEXT('POST'));
    Request->SetHeader(TEXT('Content-Type'), TEXT('application/json'));
    Request->SetContentAsString(TEXT('{\'prompt\': \'Generate water shader\'}'));
    Request->OnProcessRequestComplete().BindLambda([](FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded) {
        if (bSucceeded && HttpResponse.IsValid())
        {
            // Compila shader gerado
            FString ShaderCode = HttpResponse->GetContentAsString();
            // TODO: Integrar com RHI para compilar
            UE_LOG(LogTemp, Log, TEXT('Shader gerado: %s'), *ShaderCode);
        }
    });
    Request->ProcessRequest();
}
