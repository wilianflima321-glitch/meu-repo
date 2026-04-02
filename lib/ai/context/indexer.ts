export function buildIndex(files: { path: string; content: string }[]) {
  return files.map((f) => ({
    path: f.path,
    content: f.content
  }));
}
