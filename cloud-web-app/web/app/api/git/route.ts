/**
 * Aethel Engine - Git API Routes
 * 
 * API REST para operações Git.
 * 
 * TODAS as operações requerem autenticação.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGitService } from '@/lib/server/git-service';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Autenticação obrigatória
    const user = requireAuth(request);
    await requireEntitlementsForUser(user.userId);

    const body = await request.json();
    const { action, repoPath, ...params } = body;
    
    if (!repoPath) {
      return NextResponse.json(
        { error: 'Repository path is required' },
        { status: 400 }
      );
    }
    
    // SECURITY: Validar que o path está dentro do workspace permitido
    const safeRepoPath = assertWorkspacePath(repoPath, 'repoPath');
    const git = getGitService(safeRepoPath);
    
    switch (action) {
      // Status & Info
      case 'status': {
        const status = await git.getStatus();
        return NextResponse.json({ success: true, data: status });
      }
      
      case 'isRepository': {
        const isRepo = await git.isRepository();
        return NextResponse.json({ success: true, data: { isRepository: isRepo } });
      }
      
      case 'getRoot': {
        const root = await git.getRepositoryRoot();
        return NextResponse.json({ success: true, data: { root } });
      }
      
      case 'getConfig': {
        const config = await git.getConfig();
        return NextResponse.json({ success: true, data: config });
      }
      
      case 'setConfig': {
        const { key, value, global } = params;
        await git.setConfig(key, value, global);
        return NextResponse.json({ success: true });
      }
      
      // Staging
      case 'stage': {
        const { paths } = params;
        await git.stage(paths);
        return NextResponse.json({ success: true });
      }
      
      case 'stageAll': {
        await git.stageAll();
        return NextResponse.json({ success: true });
      }
      
      case 'unstage': {
        const { paths } = params;
        await git.unstage(paths);
        return NextResponse.json({ success: true });
      }
      
      case 'unstageAll': {
        await git.unstageAll();
        return NextResponse.json({ success: true });
      }
      
      case 'discardChanges': {
        const { paths } = params;
        await git.discardChanges(paths);
        return NextResponse.json({ success: true });
      }
      
      case 'discardAllChanges': {
        await git.discardAllChanges();
        return NextResponse.json({ success: true });
      }
      
      // Commits
      case 'commit': {
        const { message, amend, allowEmpty, signoff } = params;
        const hash = await git.commit(message, { amend, allowEmpty, signoff });
        return NextResponse.json({ success: true, data: { hash } });
      }
      
      case 'log': {
        const { maxCount, skip, since, until, author, grep, path, branch } = params;
        const commits = await git.getLog({
          maxCount,
          skip,
          since: since ? new Date(since) : undefined,
          until: until ? new Date(until) : undefined,
          author,
          grep,
          path,
          branch,
        });
        return NextResponse.json({ success: true, data: commits });
      }
      
      case 'getCommit': {
        const { ref } = params;
        const commit = await git.getCommit(ref);
        return NextResponse.json({ success: true, data: commit });
      }
      
      // Branches
      case 'branches': {
        const { includeRemotes, all } = params;
        const branches = await git.getBranches({ includeRemotes, all });
        return NextResponse.json({ success: true, data: branches });
      }
      
      case 'currentBranch': {
        const branch = await git.getCurrentBranch();
        return NextResponse.json({ success: true, data: { branch } });
      }
      
      case 'createBranch': {
        const { name, startPoint } = params;
        await git.createBranch(name, startPoint);
        return NextResponse.json({ success: true });
      }
      
      case 'deleteBranch': {
        const { name, force } = params;
        await git.deleteBranch(name, force);
        return NextResponse.json({ success: true });
      }
      
      case 'renameBranch': {
        const { oldName, newName } = params;
        await git.renameBranch(oldName, newName);
        return NextResponse.json({ success: true });
      }
      
      case 'checkout': {
        const { ref, createBranch, force } = params;
        await git.checkout(ref, { createBranch, force });
        return NextResponse.json({ success: true });
      }
      
      // Remotes
      case 'remotes': {
        const remotes = await git.getRemotes();
        return NextResponse.json({ success: true, data: remotes });
      }
      
      case 'addRemote': {
        const { name, url } = params;
        await git.addRemote(name, url);
        return NextResponse.json({ success: true });
      }
      
      case 'removeRemote': {
        const { name } = params;
        await git.removeRemote(name);
        return NextResponse.json({ success: true });
      }
      
      case 'setRemoteUrl': {
        const { name, url } = params;
        await git.setRemoteUrl(name, url);
        return NextResponse.json({ success: true });
      }
      
      // Push/Pull/Fetch
      case 'fetch': {
        const { remote, prune, all, tags } = params;
        await git.fetch({ remote, prune, all, tags });
        return NextResponse.json({ success: true });
      }
      
      case 'pull': {
        const { remote, branch, rebase, ff } = params;
        await git.pull({ remote, branch, rebase, ff });
        return NextResponse.json({ success: true });
      }
      
      case 'push': {
        const { remote, branch, force, setUpstream, tags } = params;
        await git.push({ remote, branch, force, setUpstream, tags });
        return NextResponse.json({ success: true });
      }
      
      // Merge & Rebase
      case 'merge': {
        const { branch, noCommit, squash, message, abort } = params;
        await git.merge(branch, { noCommit, squash, message, abort });
        return NextResponse.json({ success: true });
      }
      
      case 'rebase': {
        const { onto, branch, interactive, continue: cont, skip, abort } = params;
        await git.rebase({ onto, branch, interactive, continue: cont, skip, abort });
        return NextResponse.json({ success: true });
      }
      
      // Stash
      case 'stashes': {
        const stashes = await git.getStashes();
        return NextResponse.json({ success: true, data: stashes });
      }
      
      case 'stash': {
        const { message, includeUntracked, keepIndex } = params;
        await git.stash(message, { includeUntracked, keepIndex });
        return NextResponse.json({ success: true });
      }
      
      case 'stashPop': {
        const { index } = params;
        await git.stashPop(index);
        return NextResponse.json({ success: true });
      }
      
      case 'stashApply': {
        const { index } = params;
        await git.stashApply(index);
        return NextResponse.json({ success: true });
      }
      
      case 'stashDrop': {
        const { index } = params;
        await git.stashDrop(index);
        return NextResponse.json({ success: true });
      }
      
      case 'stashClear': {
        await git.stashClear();
        return NextResponse.json({ success: true });
      }
      
      // Diff
      case 'diff': {
        const { staged, commit1, commit2, path } = params;
        const diffs = await git.getDiff({ staged, commit1, commit2, path });
        return NextResponse.json({ success: true, data: diffs });
      }
      
      // Blame
      case 'blame': {
        const { filePath, startLine, endLine } = params;
        const blames = await git.blame(filePath, { startLine, endLine });
        return NextResponse.json({ success: true, data: blames });
      }
      
      // Tags
      case 'tags': {
        const tags = await git.getTags();
        return NextResponse.json({ success: true, data: tags });
      }
      
      case 'createTag': {
        const { name, message, commit, annotated } = params;
        await git.createTag(name, { message, commit, annotated });
        return NextResponse.json({ success: true });
      }
      
      case 'deleteTag': {
        const { name, remote } = params;
        await git.deleteTag(name, remote);
        return NextResponse.json({ success: true });
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Git API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repoPath = searchParams.get('repoPath');
  const action = searchParams.get('action');
  
  if (!repoPath) {
    return NextResponse.json(
      { error: 'Repository path is required' },
      { status: 400 }
    );
  }
  
  const git = getGitService(repoPath);
  
  try {
    switch (action) {
      case 'status': {
        const status = await git.getStatus();
        return NextResponse.json({ success: true, data: status });
      }
      
      case 'branches': {
        const all = searchParams.get('all') === 'true';
        const branches = await git.getBranches({ all });
        return NextResponse.json({ success: true, data: branches });
      }
      
      case 'currentBranch': {
        const branch = await git.getCurrentBranch();
        return NextResponse.json({ success: true, data: { branch } });
      }
      
      case 'remotes': {
        const remotes = await git.getRemotes();
        return NextResponse.json({ success: true, data: remotes });
      }
      
      case 'stashes': {
        const stashes = await git.getStashes();
        return NextResponse.json({ success: true, data: stashes });
      }
      
      case 'tags': {
        const tags = await git.getTags();
        return NextResponse.json({ success: true, data: tags });
      }
      
      case 'log': {
        const maxCount = parseInt(searchParams.get('maxCount') || '50', 10);
        const commits = await git.getLog({ maxCount });
        return NextResponse.json({ success: true, data: commits });
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Git API error:', error);
    
    // SECURITY: Mapear erros conhecidos, não expor detalhes internos
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    
    // Erros genéricos não devem vazar stack trace
    const safeMessage = error?.code === 'WORKSPACE_ROOT_OUT_OF_BOUNDS' 
      ? 'Access denied: path outside workspace'
      : 'Git operation failed';
    
    return NextResponse.json(
      { error: safeMessage, success: false },
      { status: 500 }
    );
  }
}
