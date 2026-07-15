/**
 * Emergency Mode API
 * 
 * Endpoints para controle do modo de emergência (Botão de Pânico).
 * Apenas owners e super_admins podem ativar/desativar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import emergencyController, { EmergencyLevel, EmergencySettings } from '@/lib/emergency-mode';

// GET - Retorna estado atual
export const GET = withAdminAuth(
  async (request, { user }) => {
    const state = emergencyController.getState();
    const metrics = await emergencyController.updateMetrics();
    
    return NextResponse.json({
      success: true,
      data: {
        ...state,
        metrics,
      },
    });
  },
  'ops:agents:view'
);

// POST - Ativa emergência
export const POST = withAdminAuth(
  async (request, { user }) => {
    const body = await request.json();
    const { level, reason } = body as { level: EmergencyLevel; reason: string };
    
    if (!level || !reason) {
      return NextResponse.json(
        { success: false, error: 'Level and reason are required' },
        { status: 400 }
      );
    }
    
    const validLevels: EmergencyLevel[] = ['warning', 'critical', 'shutdown'];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { success: false, error: 'Invalid level. Use: warning, critical, or shutdown' },
        { status: 400 }
      );
    }
    
    await emergencyController.activateEmergency(level, user.email, reason);
    
    return NextResponse.json({
      success: true,
      message: `Emergency mode ${level} activated`,
      data: emergencyController.getState(),
    });
  },
  'ops:agents:emergency'
);

// DELETE - Desativa emergência
export const DELETE = withAdminAuth(
  async (request, { user }) => {
    await emergencyController.deactivateEmergency(user.email);
    
    return NextResponse.json({
      success: true,
      message: 'Emergency mode deactivated',
      data: emergencyController.getState(),
    });
  },
  'ops:agents:emergency'
);

// PATCH - Atualiza configurações
export const PATCH = withAdminAuth(
  async (request, { user }) => {
    const body = await request.json();
    const settings = body as Partial<EmergencySettings>;
    
    emergencyController.updateSettings(settings);
    
    return NextResponse.json({
      success: true,
      message: 'Settings updated',
      data: emergencyController.getState(),
    });
  },
  'ops:agents:config'
);
