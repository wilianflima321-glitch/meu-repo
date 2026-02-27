"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Codicon from '@/components/ide/Codicon';

export default function RegisterPageV2() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica de registro aqui
    if (password !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    console.log('Registering with:', email, password);
    router.push('/ide');
  };

  return (
    <div className="min-h-screen w-full bg-grid-zinc-700/[0.15] relative flex items-center justify-center overflow-hidden bg-zinc-950">
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-zinc-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

      <div className="relative z-10 w-full max-w-md p-8 space-y-8 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl shadow-2xl shadow-blue-900/10">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Crie sua conta</h1>
          <p className="mt-2 text-zinc-400">Comece sua jornada de criação em segundos.</p>
        </div>

        <div className="flex flex-col space-y-4">
          <button className="w-full h-12 flex items-center justify-center gap-3 px-4 bg-zinc-800/50 text-zinc-200 rounded-lg hover:bg-zinc-700/80 transition-colors border border-zinc-700">
            <Codicon name="github-inverted" />
            <span>Continuar com GitHub</span>
          </button>
          <button className="w-full h-12 flex items-center justify-center gap-3 px-4 bg-zinc-800/50 text-zinc-200 rounded-lg hover:bg-zinc-700/80 transition-colors border border-zinc-700">
            <Codicon name="google" />
            <span>Continuar com Google</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex-1 h-px bg-zinc-700"></div>
          <span className="text-xs text-zinc-500">OU</span>
          <div className="flex-1 h-px bg-zinc-700"></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-2">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              placeholder="Crie uma senha forte"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-400 mb-2">Confirmar Senha</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              placeholder="Confirme sua senha"
            />
          </div>

          <div>
            <button type="submit" className="w-full h-12 flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-blue-500">
              Criar Conta
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Já tem uma conta?{' '}
          <a href="/login" className="font-medium text-blue-500 hover:text-blue-400">
            Faça login
          </a>
        </p>
      </div>
    </div>
  );
}
