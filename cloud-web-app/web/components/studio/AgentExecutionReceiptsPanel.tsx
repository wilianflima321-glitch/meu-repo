/**
 * Agent Execution Receipts Panel (P5 Operational Receipts UI)
 *
 * Renders verified audit receipts for multi-agent swarm tasks, AST symbol queries,
 * and automated TSC/ESLint fix loops with transparent status badges.
 */

import React, { useState } from 'react';
import { Terminal, CheckCircle2, AlertTriangle, Cpu, FileCode2, RefreshCw } from 'lucide-react';

export interface AgentReceiptItem {
  id: string;
  agentName: string;
  actionKind: 'write_file' | 'edit_file' | 'ast_query' | 'tsc_validation';
  targetPath: string;
  timestamp: string;
  status: 'passed' | 'fixed' | 'gated' | 'failed';
  fixAttempts?: number;
  evidenceHash: string;
}

const MOCK_INITIAL_RECEIPTS: AgentReceiptItem[] = [
  {
    id: 'rcpt-001',
    agentName: 'AST-Symbol-Indexer',
    actionKind: 'ast_query',
    targetPath: 'packages/aethel-kernel-rust/src/tree_sitter_ast_indexer.rs',
    timestamp: new Date().toISOString(),
    status: 'passed',
    evidenceHash: 'fnv1a-0x8f4b2c1d',
  },
  {
    id: 'rcpt-002',
    agentName: 'TSC-Validation-Swarm',
    actionKind: 'tsc_validation',
    targetPath: 'cloud-web-app/web/lib/storage/aethel-storage-adapter.ts',
    timestamp: new Date().toISOString(),
    status: 'fixed',
    fixAttempts: 1,
    evidenceHash: 'tsc-0x12a9b3c4',
  },
  {
    id: 'rcpt-003',
    agentName: 'Storage-Spine-Agent',
    actionKind: 'write_file',
    targetPath: 'cloud-web-app/web/lib/storage/aethel-workbench-storage.ts',
    timestamp: new Date().toISOString(),
    status: 'passed',
    evidenceHash: 'sha256-0x9e8d7c6b',
  },
];

export const AgentExecutionReceiptsPanel: React.FC<{ className?: string }> = ({ className }) => {
  const [receipts] = useState<AgentReceiptItem[]>(MOCK_INITIAL_RECEIPTS);

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-slate-100 p-4 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md ${className ?? ''}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wide bg-gradient-to-r from-cyan-400 via-sky-300 to-[var(--aethel-primary)] bg-clip-text text-transparent">
            Agent Execution Receipts & Audit Ledger
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 font-mono font-semibold">
          SWARM AUDIT ACTIVE
        </span>
      </div>

      {/* Receipts List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1">
        {receipts.map((rcpt) => (
          <div
            key={rcpt.id}
            className="p-3 bg-slate-900/90 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-mono font-semibold text-slate-200">{rcpt.agentName}</span>
              </div>
              {rcpt.status === 'passed' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/40">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              )}
              {rcpt.status === 'fixed' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-mono font-bold px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/40">
                  <RefreshCw className="w-3 h-3" /> AUTO-FIXED ({rcpt.fixAttempts}x)
                </span>
              )}
              {rcpt.status === 'gated' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 font-mono font-bold px-2 py-0.5 rounded bg-sky-950/50 border border-sky-800/40">
                  <AlertTriangle className="w-3 h-3" /> GATED
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-400 truncate" title={rcpt.targetPath}>
              {rcpt.targetPath}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/50">
              <span>Hash: {rcpt.evidenceHash}</span>
              <span>{new Date(rcpt.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
