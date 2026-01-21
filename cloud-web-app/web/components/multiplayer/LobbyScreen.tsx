'use client';

/**
 * AETHEL ENGINE - Multiplayer Lobby Screen
 * 
 * Professional lobby system connected to networking-multiplayer.ts
 * Provides matchmaking, lobby creation, and player management.
 * 
 * Features:
 * - Lobby browser with filters
 * - Create/join lobbies
 * - Player list with ping indicators
 * - Ready system
 * - In-lobby chat
 * - Game mode selection
 * 
 * @see lib/networking-multiplayer.ts for backend implementation
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  NetworkConfig,
  NetworkPlayer,
  Lobby,
  MessageType,
} from '@/lib/networking-multiplayer';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// Types
// ============================================================================

interface LobbyScreenProps {
  serverUrl?: string;
  onGameStart?: (lobby: Lobby) => void;
  onDisconnect?: () => void;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const LOBBIES_API_URL = '/api/multiplayer/lobbies';

const GAME_MODES = [
  { id: 'deathmatch', name: 'Deathmatch', description: 'Combate todos contra todos', icon: '⚔️' },
  { id: 'team-dm', name: 'Team Deathmatch', description: 'Combate em equipes', icon: '👥' },
  { id: 'coop', name: 'Cooperativo', description: 'Jogue junto contra a IA', icon: '🤝' },
  { id: 'ctf', name: 'Capture a Bandeira', description: 'Capture as bandeiras inimigas', icon: '🚩' },
  { id: 'survival', name: 'Sobrevivência', description: 'Sobreviva às ondas de inimigos', icon: '🧟' },
];

// ============================================================================
// Components
// ============================================================================

function PingIndicator({ ping }: { ping: number }) {
  const color = ping < 50 ? 'text-green-400' : ping < 100 ? 'text-yellow-400' : 'text-red-400';
  const bars = ping < 50 ? 4 : ping < 100 ? 3 : ping < 150 ? 2 : 1;

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-1 rounded-sm ${i <= bars ? color.replace('text-', 'bg-') : 'bg-gray-600'}`}
            style={{ height: `${i * 3 + 4}px` }}
          />
        ))}
      </div>
      <span className={`text-xs ${color}`}>{ping}ms</span>
    </div>
  );
}

function PlayerCard({ player, isReady }: { player: NetworkPlayer; isReady?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded ${
      player.isHost ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-gray-800'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          player.isHost ? 'bg-yellow-600' : 'bg-blue-600'
        }`}>
          {player.name[0].toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{player.name}</span>
            {player.isHost && <span className="text-xs bg-yellow-600 px-1.5 py-0.5 rounded">HOST</span>}
            {player.isLocal && <span className="text-xs bg-blue-600 px-1.5 py-0.5 rounded">YOU</span>}
          </div>
          <PingIndicator ping={player.ping} />
        </div>
      </div>
      {isReady !== undefined && (
        <div className={`px-3 py-1 rounded text-sm font-medium ${
          isReady ? 'bg-green-600' : 'bg-gray-600'
        }`}>
          {isReady ? 'PRONTO' : 'NÃO PRONTO'}
        </div>
      )}
    </div>
  );
}

function LobbyCard({ 
  lobby, 
  onJoin 
}: { 
  lobby: Lobby; 
  onJoin: (lobbyId: string) => void;
}) {
  const mode = GAME_MODES.find(m => m.id === lobby.gameMode);
  const isFull = lobby.players.length >= lobby.maxPlayers;

  return (
    <div className={`p-4 bg-gray-800 rounded-lg border transition-colors ${
      isFull ? 'border-gray-700 opacity-60' : 'border-gray-700 hover:border-blue-500'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">{lobby.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{mode?.icon} {mode?.name}</span>
            {lobby.isPrivate && <span className="text-yellow-400">🔒 Privado</span>}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-bold ${isFull ? 'text-red-400' : 'text-green-400'}`}>
            {lobby.players.length}/{lobby.maxPlayers}
          </div>
          <div className="text-xs text-gray-500">jogadores</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {lobby.players.slice(0, 4).map(player => (
          <div
            key={player.id}
            className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold"
            title={player.name}
          >
            {player.name[0]}
          </div>
        ))}
        {lobby.players.length > 4 && (
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs">
            +{lobby.players.length - 4}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Mapa: {(lobby.settings as any).mapName || 'Aleatório'}
        </div>
        <button
          onClick={() => !isFull && onJoin(lobby.id)}
          disabled={isFull}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isFull 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {isFull ? 'Cheio' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}

function CreateLobbyModal({
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Criar Sala</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome da Sala</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome da sala..."
              className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Modo de Jogo</label>
            <div className="grid grid-cols-2 gap-2">
              {GAME_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-3 rounded text-left transition-colors ${
                    mode === m.id
                      ? 'bg-blue-600 border-blue-400'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  } border`}
                >
                  <div className="font-medium">{m.icon} {m.name}</div>
                  <div className="text-xs text-gray-400">{m.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Máximo de Jogadores: {maxPlayers}</label>
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
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onCreate(name || 'Minha Sala', mode, maxPlayers, isPrivate);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded font-medium transition-colors"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function LobbyScreen({
  serverUrl = 'ws://localhost:1234',
  onGameStart,
  onDisconnect,
}: LobbyScreenProps) {
  // Toast notifications
  const toast = useToast();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Lobby state
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoadingLobbies, setIsLoadingLobbies] = useState(false);
  const [lobbiesError, setLobbiesError] = useState<string | null>(null);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Local player - ID único gerado de forma segura
  const [localPlayer] = useState<NetworkPlayer>(() => ({
    id: `player-${crypto.randomUUID()}`,
    name: `Jogador${Math.floor(Date.now() % 10000)}`,
    isHost: false,
    isLocal: true,
    ping: 0,
    state: {} as any,
    lastInputTime: 0,
  }));

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch lobbies from API
  const fetchLobbies = useCallback(async () => {
    setIsLoadingLobbies(true);
    setLobbiesError(null);

    try {
      const response = await fetch(LOBBIES_API_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch lobbies: ${response.statusText}`);
      }

      const data = await response.json();
      setLobbies(data.lobbies || data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load lobbies';
      setLobbiesError(errorMessage);
      toast.error('Connection Error', errorMessage);
    } finally {
      setIsLoadingLobbies(false);
    }
  }, [toast]);

  // Load lobbies when connected
  useEffect(() => {
    if (isConnected && !currentLobby) {
      fetchLobbies();
    }
  }, [isConnected, currentLobby, fetchLobbies]);

  // Handle connection
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Verificar conectividade com o servidor de matchmaking
      const response = await fetch('/api/multiplayer/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        throw new Error('Servidor de matchmaking indisponível');
      }

      // Em produção, conectar ao WebSocket real:
      // const manager = new NetworkManager({ serverUrl, ... });
      // await manager.connect();

      setIsConnected(true);
      toast.success('Conectado', 'Conectado ao servidor com sucesso');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha na conexão';
      setConnectionError(errorMessage);
      toast.error('Falha na Conexão', errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [serverUrl, toast]);

  // Handle create lobby
  const handleCreateLobby = useCallback(async (name: string, mode: string, maxPlayers: number, isPrivate: boolean) => {
    try {
      const response = await fetch(LOBBIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          gameMode: mode,
          maxPlayers,
          isPrivate,
          hostId: localPlayer.id,
          hostName: localPlayer.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create lobby');
      }

      const newLobby = await response.json();

      // Fallback to local lobby if API doesn't return full lobby object
      const lobby: Lobby = newLobby.id ? newLobby : {
        id: `lobby-${Date.now()}`,
        name,
        host: localPlayer.id,
        players: [{ ...localPlayer, isHost: true }],
        maxPlayers,
        isPrivate,
        gameMode: mode,
        settings: { mapName: 'Random' },
      };

      setCurrentLobby(lobby);
      setIsHost(true);
      setLobbies(prev => [...prev, lobby]);
      toast.success('Sala Criada', `"${name}" está aberta para jogadores`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha ao criar sala';
      toast.error('Falha na Criação', errorMessage);
    }
  }, [localPlayer, toast]);

  // Handle join lobby
  const handleJoinLobby = useCallback(async (lobbyId: string) => {
    const lobby = lobbies.find(l => l.id === lobbyId);
    if (!lobby) {
      toast.error('Sala Não Encontrada', 'A sala pode ter sido fechada');
      return;
    }
    if (lobby.players.length >= lobby.maxPlayers) {
      toast.warning('Sala Cheia', 'Esta sala atingiu a capacidade máxima');
      return;
    }

    try {
      const response = await fetch(`${LOBBIES_API_URL}/${lobbyId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: localPlayer.id,
          playerName: localPlayer.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join lobby');
      }

      const updatedLobby = {
        ...lobby,
        players: [...lobby.players, localPlayer],
      };

      setCurrentLobby(updatedLobby);
      setIsHost(false);
      setLobbies(prev => prev.map(l => l.id === lobbyId ? updatedLobby : l));

      // Add system message
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        playerId: 'system',
        playerName: 'Sistema',
        content: `${localPlayer.name} entrou na sala`,
        timestamp: Date.now(),
      }]);

      toast.success('Entrou na Sala', `Bem-vindo a "${lobby.name}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha ao entrar na sala';
      toast.error('Falha ao Entrar', errorMessage);
    }
  }, [lobbies, localPlayer, toast]);

  // Handle leave lobby
  const handleLeaveLobby = useCallback(async () => {
    if (!currentLobby) return;

    try {
      await fetch(`${LOBBIES_API_URL}/${currentLobby.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: localPlayer.id }),
      });
    } catch (error) {
      // Continue with local state update even if API fails
      console.error('Falha ao notificar servidor sobre saída:', error);
    }

    const lobbyName = currentLobby.name;
    const updatedLobby = {
      ...currentLobby,
      players: currentLobby.players.filter(p => p.id !== localPlayer.id),
    };

    setLobbies(prev => prev.map(l => l.id === currentLobby.id ? updatedLobby : l));
    setCurrentLobby(null);
    setIsHost(false);
    setIsReady(false);
    setReadyPlayers(new Set());
    setMessages([]);
    toast.info('Saiu da Sala', `Você saiu de "${lobbyName}"`);
  }, [currentLobby, localPlayer.id, toast]);

  // Handle ready toggle
  const handleToggleReady = useCallback(() => {
    setIsReady(prev => !prev);
    setReadyPlayers(prev => {
      const next = new Set(prev);
      if (next.has(localPlayer.id)) {
        next.delete(localPlayer.id);
      } else {
        next.add(localPlayer.id);
      }
      return next;
    });
  }, [localPlayer.id]);

  // Handle start game
  const handleStartGame = useCallback(() => {
    if (!currentLobby || !isHost) return;

    // Check if all players are ready
    const allReady = currentLobby.players.every(p => 
      p.isHost || readyPlayers.has(p.id)
    );

    if (!allReady && currentLobby.players.length > 1) {
      toast.warning('Não é Possível Iniciar', 'Nem todos os jogadores estão prontos!');
      return;
    }

    toast.success('Iniciando Jogo', 'Prepare-se!');
    onGameStart?.(currentLobby);
  }, [currentLobby, isHost, readyPlayers, onGameStart, toast]);

  // Handle send chat
  const handleSendChat = useCallback(() => {
    if (!chatInput.trim() || !currentLobby) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      playerId: localPlayer.id,
      playerName: localPlayer.name,
      content: chatInput.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, message]);
    setChatInput('');
  }, [chatInput, currentLobby, localPlayer]);

  // Filter lobbies
  const filteredLobbies = lobbies.filter(lobby => {
    if (searchQuery && !lobby.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterMode && lobby.gameMode !== filterMode) {
      return false;
    }
    return true;
  });

  // Not connected screen
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Multijogador</h1>
          <p className="text-gray-400 mb-8">Conecte-se para jogar com outros</p>

          {connectionError && (
            <div className="bg-red-900/50 border border-red-600 rounded p-4 mb-4 max-w-md">
              <p className="text-red-400">{connectionError}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg font-bold text-xl transition-colors"
          >
            {isConnecting ? 'Conectando...' : 'Conectar ao Servidor'}
          </button>

          <p className="text-gray-500 text-sm mt-4">
            Servidor: {serverUrl}
          </p>
        </div>
      </div>
    );
  }

  // In lobby screen
  if (currentLobby) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex">
        {/* Main area */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">{currentLobby.name}</h1>
              <p className="text-gray-400">
                {GAME_MODES.find(m => m.id === currentLobby.gameMode)?.name} • 
                {currentLobby.players.length}/{currentLobby.maxPlayers} jogadores
              </p>
            </div>
            <button
              onClick={handleLeaveLobby}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-medium transition-colors"
            >
              Sair da Sala
            </button>
          </div>

          {/* Players */}
          <div className="mb-6">
            <h2 className="font-bold mb-3">Jogadores</h2>
            <div className="space-y-2">
              {currentLobby.players.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isReady={player.isHost || readyPlayers.has(player.id)}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {isHost ? (
              <button
                onClick={handleStartGame}
                className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-xl transition-colors"
              >
                Iniciar Jogo
              </button>
            ) : (
              <button
                onClick={handleToggleReady}
                className={`flex-1 px-6 py-4 rounded-lg font-bold text-xl transition-colors ${
                  isReady
                    ? 'bg-yellow-600 hover:bg-yellow-500'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                {isReady ? 'Não Pronto' : 'Pronto'}
              </button>
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="w-80 border-l border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-bold">Bate-papo</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={msg.playerId === 'system' ? 'text-center' : ''}>
                {msg.playerId === 'system' ? (
                  <span className="text-gray-500 text-sm italic">{msg.content}</span>
                ) : (
                  <>
                    <span className={`font-medium ${
                      msg.playerId === localPlayer.id ? 'text-blue-400' : 'text-gray-300'
                    }`}>
                      {msg.playerName}:
                    </span>
                    <span className="text-gray-300 ml-2">{msg.content}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Digite uma mensagem..."
                className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleSendChat}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lobby browser
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Salas Multijogador</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors"
            >
              + Criar Sala
            </button>
            <button
              onClick={() => {
                setIsConnected(false);
                onDisconnect?.();
              }}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Desconectar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar salas..."
            className="flex-1 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
          />
          <select
            value={filterMode || ''}
            onChange={(e) => setFilterMode(e.target.value || null)}
            className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
          >
            <option value="">Todos os Modos</option>
            {GAME_MODES.map(mode => (
              <option key={mode.id} value={mode.id}>{mode.name}</option>
            ))}
          </select>
        </div>

        {/* Lobby list */}
        {isLoadingLobbies ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Carregando salas...</p>
          </div>
        ) : lobbiesError ? (
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <p className="text-red-400 text-lg mb-2">Falha ao carregar salas</p>
            <p className="text-gray-500 mb-4">{lobbiesError}</p>
            <button
              onClick={fetchLobbies}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : filteredLobbies.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-600 text-6xl mb-4">🎮</div>
            <p className="text-gray-400 text-xl mb-2">
              {lobbies.length === 0 ? 'Nenhuma sala disponível' : 'Nenhuma sala encontrada'}
            </p>
            <p className="text-gray-500 mb-6">
              {lobbies.length === 0 
                ? 'Seja o primeiro a criar uma sala e começar a jogar!'
                : 'Tente ajustar sua busca ou filtros'
              }
            </p>
            {lobbies.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors"
              >
                + Criar Primeira Sala
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLobbies.map(lobby => (
              <LobbyCard
                key={lobby.id}
                lobby={lobby}
                onJoin={handleJoinLobby}
              />
            ))}
          </div>
        )}
      </div>

      <CreateLobbyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateLobby}
      />
    </div>
  );
}
