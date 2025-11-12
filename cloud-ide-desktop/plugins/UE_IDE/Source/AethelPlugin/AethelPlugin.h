// AethelPlugin.h: Header para Plugin
#pragma once

#include 'CoreMinimal.h'
#include 'Modules/ModuleInterface.h'
#include 'PhysXIncludes.h'  // Para PhysX física

class FAethelPluginModule : public IModuleInterface
{
public:
    virtual void StartupModule() override;
    virtual void ShutdownModule() override;
    
    // Novo método para conectar ao backend Aethel
    void ConnectToAethelBackend();
    
    // Método para simulação física com PhysX
    void SimulatePhysicsWithAethel();
    
    // Método para gerar shaders via Aethel
    void GenerateShaderWithAethel();
};
