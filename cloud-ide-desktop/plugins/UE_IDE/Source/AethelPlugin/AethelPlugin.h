// AethelPlugin.h: Header para Plugin
#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"

class FAethelPluginModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

	// Dispara uma chamada de conectividade/handshake com o backend Aethel.
	void ConnectToAethelBackend();

	// Pontos de integração futuros (mantidos como stubs compiláveis).
	void SimulatePhysicsWithAethel();
	void GenerateShaderWithAethel();
};
