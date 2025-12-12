import React, { useState, useEffect, useCallback } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { getGitStatus, gitCommit, createBranch, getBranches, getCommits } from '@/services/api';
import {
  GitBranch, GitCommit, GitMerge, GitPullRequest, Plus, Minus, Check,
  RotateCcw, Upload, Download, RefreshCw, ChevronDown, ChevronRight,
  FileCode, FileDiff, Eye, MoreHorizontal, Clock, User, Hash
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const GitPanel = () => {
  const { currentProject, gitStatus, setGitStatus, gitBranch, setGitBranch, gitChanges, setGitChanges } = useIDEStore();
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [commits, setCommits] = useState([]);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('changes');
  const [expandedSections, setExpandedSections] = useState(new Set(['staged', 'changes']));

  useEffect(() => {
    if (currentProject?.id) {
      loadGitData();
    }
  }, [currentProject?.id]);

  const loadGitData = async () => {
    try {
      const [statusRes, branchesRes, commitsRes] = await Promise.all([
        getGitStatus(currentProject.id),
        getBranches(currentProject.id),
        getCommits(currentProject.id, 50)
      ]);
      setGitStatus(statusRes.data);
      setGitBranch(statusRes.data.branch);
      setGitChanges(statusRes.data.changes || []);
      setBranches(branchesRes.data);
      setCommits(commitsRes.data);
    } catch (err) {
      console.error('Failed to load git data:', err);
    }
  };

  const handleStageFile = (file) => {
    if (stagedFiles.includes(file.file)) {
      setStagedFiles(prev => prev.filter(f => f !== file.file));
    } else {
      setStagedFiles(prev => [...prev, file.file]);
    }
  };

  const handleStageAll = () => {
    setStagedFiles(gitChanges.map(c => c.file));
  };

  const handleUnstageAll = () => {
    setStagedFiles([]);
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || stagedFiles.length === 0) return;
    setLoading(true);
    try {
      await gitCommit(currentProject.id, {
        message: commitMessage,
        files: stagedFiles
      });
      setCommitMessage('');
      setStagedFiles([]);
      await loadGitData();
    } catch (err) {
      console.error('Failed to commit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      await createBranch(currentProject.id, { name: newBranchName, checkout: true });
      setNewBranchName('');
      setShowNewBranch(false);
      await loadGitData();
    } catch (err) {
      console.error('Failed to create branch:', err);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'added': return <Plus className="w-3 h-3 text-green-500" />;
      case 'modified': return <FileCode className="w-3 h-3 text-yellow-500" />;
      case 'deleted': return <Minus className="w-3 h-3 text-red-500" />;
      default: return <FileDiff className="w-3 h-3 text-blue-500" />;
    }
  };

  const unstagedChanges = gitChanges.filter(c => !stagedFiles.includes(c.file));
  const stagedChangesData = gitChanges.filter(c => stagedFiles.includes(c.file));

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-white">Source Control</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadGitData} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
              <DropdownMenuItem className="text-xs" onClick={handleStageAll}>Stage All Changes</DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={handleUnstageAll}>Unstage All</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuItem className="text-xs">Discard All Changes</DropdownMenuItem>
              <DropdownMenuItem className="text-xs">Stash Changes</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Branch Selector */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8 bg-zinc-800 border-zinc-700">
              <div className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5" />
                <span>{gitBranch}</span>
              </div>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-700 w-56">
            <div className="px-2 py-1.5 text-xs text-zinc-500">Branches</div>
            {branches.map(branch => (
              <DropdownMenuItem
                key={branch.name}
                className={cn("text-xs", branch.current && "bg-zinc-800")}
                onClick={() => setGitBranch(branch.name)}
              >
                <GitBranch className="w-3 h-3 mr-2" />
                {branch.name}
                {branch.current && <Check className="w-3 h-3 ml-auto" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem className="text-xs" onClick={() => setShowNewBranch(true)}>
              <Plus className="w-3 h-3 mr-2" /> Create New Branch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-3 mx-3 mt-2 bg-zinc-800 h-8">
          <TabsTrigger value="changes" className="text-xs h-7">Changes</TabsTrigger>
          <TabsTrigger value="commits" className="text-xs h-7">History</TabsTrigger>
          <TabsTrigger value="branches" className="text-xs h-7">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
          {/* Commit Input */}
          <div className="p-3 border-b border-zinc-800">
            <Textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message"
              className="bg-zinc-800 border-zinc-700 text-white text-xs min-h-[60px] resize-none"
              data-testid="commit-message"
            />
            <Button
              className="w-full mt-2 h-8 text-xs"
              disabled={!commitMessage.trim() || stagedFiles.length === 0 || loading}
              onClick={handleCommit}
              data-testid="commit-btn"
            >
              <Check className="w-3 h-3 mr-1" />
              Commit ({stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''})
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {/* Staged Changes */}
            <div className="border-b border-zinc-800">
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                onClick={() => toggleSection('staged')}
              >
                {expandedSections.has('staged') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Staged Changes ({stagedChangesData.length})
              </button>
              {expandedSections.has('staged') && (
                <div className="pb-2">
                  {stagedChangesData.map((change, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 cursor-pointer group"
                      onClick={() => handleStageFile(change)}
                    >
                      {getStatusIcon(change.status)}
                      <span className="text-xs text-zinc-300 flex-1 truncate">{change.file}</span>
                      <Minus className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                  {stagedChangesData.length === 0 && (
                    <div className="px-3 py-2 text-xs text-zinc-600">No staged changes</div>
                  )}
                </div>
              )}
            </div>

            {/* Changes */}
            <div>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                onClick={() => toggleSection('changes')}
              >
                {expandedSections.has('changes') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Changes ({unstagedChanges.length})
              </button>
              {expandedSections.has('changes') && (
                <div className="pb-2">
                  {unstagedChanges.map((change, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 cursor-pointer group"
                      onClick={() => handleStageFile(change)}
                    >
                      {getStatusIcon(change.status)}
                      <span className="text-xs text-zinc-300 flex-1 truncate">{change.file}</span>
                      <Plus className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                  {unstagedChanges.length === 0 && (
                    <div className="px-3 py-2 text-xs text-zinc-600">No changes</div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="commits" className="flex-1 overflow-hidden mt-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {commits.map((commit, i) => (
                <div key={i} className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer mb-1">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      {commit.author?.[0] || 'D'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{commit.message}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {commit.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {commit.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Hash className="w-3 h-3 text-zinc-600" />
                        <code className="text-xs text-zinc-500">{commit.hash}</code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="branches" className="flex-1 overflow-hidden mt-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {branches.map((branch, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1",
                    branch.current ? "bg-blue-500/10 border border-blue-500/30" : "hover:bg-zinc-800"
                  )}
                >
                  <GitBranch className={cn("w-4 h-4", branch.current ? "text-blue-400" : "text-zinc-500")} />
                  <div className="flex-1">
                    <div className={cn("text-sm font-medium", branch.current ? "text-blue-400" : "text-white")}>
                      {branch.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {branch.ahead > 0 && <span className="text-green-400">↑{branch.ahead}</span>}
                      {branch.behind > 0 && <span className="text-red-400 ml-2">↓{branch.behind}</span>}
                    </div>
                  </div>
                  {branch.current && <Check className="w-4 h-4 text-blue-400" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Sync Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800">
        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1">
          <Download className="w-3 h-3" /> Pull
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1">
          <Upload className="w-3 h-3" /> Push
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0">
          <GitMerge className="w-3 h-3" />
        </Button>
      </div>

      {/* New Branch Dialog */}
      <Dialog open={showNewBranch} onOpenChange={setShowNewBranch}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Branch</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a new branch from {gitBranch}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="feature/my-new-feature"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBranch(false)}>Cancel</Button>
            <Button onClick={handleCreateBranch} disabled={!newBranchName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GitPanel;
