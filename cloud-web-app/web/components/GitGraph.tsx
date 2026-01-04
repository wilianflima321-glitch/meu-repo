'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getGitClient, GitCommit } from '@/lib/git/git-client';

interface GitGraphNode {
  commit: GitCommit;
  x: number;
  y: number;
  branch: number;
  parents: string[];
}

export default function GitGraph() {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [nodes, setNodes] = useState<GitGraphNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const gitClient = useMemo(() => getGitClient('/workspace'), []);

  const loadCommits = useCallback(async () => {
    try {
      const log = await gitClient.log(100);
      setCommits(log);
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setLoading(false);
    }
  }, [gitClient]);

  useEffect(() => {
    loadCommits();
  }, [loadCommits]);

  useEffect(() => {
    if (commits.length > 0) {
      const graphNodes = calculateGraphLayout(commits);
      setNodes(graphNodes);
      drawGraph(graphNodes);
    }
  }, [commits]);

  const calculateGraphLayout = (commits: GitCommit[]): GitGraphNode[] => {
    const nodes: GitGraphNode[] = [];
    const branchMap = new Map<string, number>();
    let nextBranch = 0;

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      
      // Determine branch
      let branch = branchMap.get(commit.hash);
      if (branch === undefined) {
        branch = nextBranch++;
        branchMap.set(commit.hash, branch);
      }

      // Calculate position
      const x = 50 + branch * 30;
      const y = 50 + i * 60;

      nodes.push({
        commit,
        x,
        y,
        branch,
        parents: commit.parents
      });

      // Map parent commits to branches
      for (const parent of commit.parents) {
        if (!branchMap.has(parent)) {
          branchMap.set(parent, branch);
        }
      }
    }

    return nodes;
  };

  const drawGraph = (nodes: GitGraphNode[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;

    for (const node of nodes) {
      for (const parentHash of node.parents) {
        const parentNode = nodes.find(n => n.commit.hash === parentHash);
        if (parentNode) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(parentNode.x, parentNode.y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
      const color = colors[node.branch % colors.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const handleCommitClick = (commit: GitCommit) => {
    setSelectedCommit(commit);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex h-full">
        {/* Graph Canvas */}
        <div className="flex-1 overflow-auto p-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={Math.max(600, nodes.length * 60 + 100)}
              className="bg-slate-800/50 backdrop-blur-sm rounded-lg"
            />
            
            {/* Commit Labels */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {nodes.map((node, index) => (
                <div
                  key={node.commit.hash}
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${node.x + 20}px`,
                    top: `${node.y - 10}px`
                  }}
                >
                  <button
                    onClick={() => handleCommitClick(node.commit)}
                    className="text-left hover:bg-slate-700/50 rounded px-2 py-1 transition-colors"
                  >
                    <div className="text-sm text-white font-mono">
                      {node.commit.hash.substring(0, 7)}
                    </div>
                    <div className="text-xs text-slate-300 max-w-xs truncate">
                      {node.commit.message.split('\n')[0]}
                    </div>
                    <div className="text-xs text-slate-500">
                      {node.commit.author} • {formatDate(node.commit.date)}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commit Details Panel */}
        {selectedCommit && (
          <div className="w-96 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700 p-6 overflow-y-auto">
            <div className="mb-4">
              <button
                onClick={() => setSelectedCommit(null)}
                className="text-slate-400 hover:text-white mb-4"
              >
                ← Back
              </button>
              <h3 className="text-xl font-bold text-white mb-2">Commit Details</h3>
            </div>

            <div className="space-y-4">
              {/* Hash */}
              <div>
                <div className="text-sm text-slate-400 mb-1">Commit</div>
                <div className="text-white font-mono text-sm bg-slate-900 p-2 rounded">
                  {selectedCommit.hash}
                </div>
              </div>

              {/* Author */}
              <div>
                <div className="text-sm text-slate-400 mb-1">Author</div>
                <div className="text-white">
                  {selectedCommit.author}
                  <div className="text-sm text-slate-400">{selectedCommit.email}</div>
                </div>
              </div>

              {/* Date */}
              <div>
                <div className="text-sm text-slate-400 mb-1">Date</div>
                <div className="text-white">
                  {selectedCommit.date.toLocaleString()}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="text-sm text-slate-400 mb-1">Message</div>
                <div className="text-white whitespace-pre-wrap bg-slate-900 p-3 rounded">
                  {selectedCommit.message}
                </div>
              </div>

              {/* Parents */}
              {selectedCommit.parents.length > 0 && (
                <div>
                  <div className="text-sm text-slate-400 mb-1">Parents</div>
                  <div className="space-y-1">
                    {selectedCommit.parents.map(parent => (
                      <div
                        key={parent}
                        className="text-white font-mono text-sm bg-slate-900 p-2 rounded"
                      >
                        {parent.substring(0, 7)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-700 space-y-2">
                <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                  View Changes
                </button>
                <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                  Checkout
                </button>
                <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                  Create Branch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
