'use client';

import React, { useState } from 'react';
import type { Lobby, NetworkPlayer } from '@/lib/networking-multiplayer';

// ============================================================================
// Constants
// ============================================================================

export const LOBBIES_API_URL = '/api/multiplayer/lobbies';

export const GAME_MODES = [
  { id: 'deathmatch', name: 'Deathmatch', description: 'Combate todos contra todos', icon: '⚔️' },
  { id: 'team-dm', name: 'Team Deathmatch', description: 'Combate em equipes', icon: '👥' },
  { id: 'coop', name: 'Cooperactive', description: 'Jogue junto contra a IA', icon: '🤝' },
  { id: 'ctf', name: 'Capture a Bandeira', description: 'Capture as bandeiras inimigas', icon: '🚩' },
  { id: 'survival', name: 'Survival', description: 'Survive waves of enemies', icon: '🧟' },
];

// ============================================================================
// Components
// ============================================================================

export function PingIndicator({ ping }: { ping: number }) {
  const color = ping < 50 ? 'text-[var(--aethel-success-light)]' : ping < 100 ? 'text-[var(--aethel-warning-light)]' : 'text-[var(--aethel-error-light)]';
  const bars = ping < 50 ? 4 : ping < 100 ? 3 : ping < 150 ? 2 : 1;

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-1 rounded-sm ${i <= bars ? color.replace('text-', 'bg-') : 'bg-[var(--aethel-surface-secondary)]'}`}
            style={{ height: `${i * 3 + 4}px` }}
          />
        ))}
      </div>
      <span className={`text-xs ${color}`}>{ping}ms</span>
    </div>
  );
}

export function PlayerCard({ player, isReady }: { player: NetworkPlayer; isReady?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded ${
      player.isHost ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]' : 'bg-[var(--aethel-surface-secondary)]'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          player.isHost ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]' : 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]'
        }`}>
          {player.name[0].toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{player.name}</span>
            {player.isHost && <span className="text-xs bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-1.5 py-0.5 rounded">HOST</span>}
            {player.isLocal && <span className="text-xs bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-1.5 py-0.5 rounded">YOU</span>}
          </div>
          <PingIndicator ping={player.ping} />
        </div>
      </div>
      {isReady !== undefined && (
        <div className={`px-3 py-1 rounded text-sm font-medium ${
          isReady ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]' : 'bg-[var(--aethel-surface-secondary)]'
        }`}>
          {isReady ? 'READY' : 'NOT READY'}
        </div>
      )}
    </div>
  );
}

export function LobbyCard({
  lobby,
  onJoin
}: {
  lobby: Lobby;
  onJoin: (lobbyId: string) => void;
}) {
  const mode = GAME_MODES.find(m => m.id === lobby.gameMode);
  const isFull = lobby.players.length >= lobby.maxPlayers;

  return (
    <div className={`p-4 bg-[var(--aethel-surface-secondary)] rounded-lg border transition-colors ${
      isFull ? 'border-[var(--aethel-border-primary)] opacity-60' : 'border-[var(--aethel-border-primary)] hover:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{lobby.name}</h3>
          <div className="flex items-center gap-2 text-sm text-[var(--aethel-text-secondary)]">
            <span>{mode?.icon} {mode?.name}</span>
            {lobby.isPrivate && <span className="text-[var(--aethel-warning-light)]">🔒 Privado</span>}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-bold ${isFull ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-success-light)]'}`}>
            {lobby.players.length}/{lobby.maxPlayers}
          </div>
          <div className="text-xs text-[var(--aethel-text-secondary)]">jogadores</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {lobby.players.slice(0, 4).map(player => (
          <div
            key={player.id}
            className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] flex items-center justify-center text-xs font-bold"
            title={player.name}
          >
            {player.name[0]}
          </div>
        ))}
        {lobby.players.length > 4 && (
          <div className="w-8 h-8 rounded-full bg-[var(--aethel-surface-secondary)] flex items-center justify-center text-xs">
            +{lobby.players.length - 4}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--aethel-text-secondary)]">
          Map: {(lobby.settings as any).mapName || 'Random'}
        </div>
        <button type="button" aria-label={isFull ? `Sala ${lobby.name} lotada` : `Sign in na sala ${lobby.name}`}
          onClick={() => !isFull && onJoin(lobby.id)}
          disabled={isFull}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isFull
              ? 'bg-[var(--aethel-surface-secondary)] cursor-not-allowed'
              : 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]'
          }`}
        >
          {isFull ? 'Cheio' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}

export function CreateLobbyModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, mode: string, maxPlayers: number, isPrivate: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('deathmatch');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] flex items-center justify-center z-50">
      <div className="bg-[var(--aethel-surface-secondary)] rounded-lg p-6 w-full max-w-md border border-[var(--aethel-border-primary)]">
        <h2 className="text-xl font-bold mb-4">Create Sala</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--aethel-text-secondary)] mb-1">Room name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome da sala..."
              className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] rounded border border-[var(--aethel-border-primary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--aethel-text-secondary)] mb-2">Modo de Jogo</label>
            <div className="grid grid-cols-2 gap-2">
              {GAME_MODES.map(m => (
                <button type="button" aria-label={`Select game mode ${m.name}`}
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-3 rounded text-left transition-colors ${
                    mode === m.id
                      ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
                      : 'bg-[var(--aethel-surface-secondary)] border-[var(--aethel-border-primary)] hover:border-[var(--aethel-border-primary)]'
                  } border`}
                >
                  <div className="font-medium">{m.icon} {m.name}</div>
                  <div className="text-xs text-[var(--aethel-text-secondary)]">{m.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--aethel-text-secondary)] mb-1">Max players: {maxPlayers}</label>
            <input
              type="range"
              min={2}
              max={16}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Sala Privada (apenas por convite)</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" aria-label="Cancel room creation"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)] rounded font-medium transition-colors"
          >
            Cancel
          </button>
          <button type="button" aria-label="Create sala multiplayer"
            onClick={() => {
              onCreate(name || 'Minha Sala', mode, maxPlayers, isPrivate);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded font-medium transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
