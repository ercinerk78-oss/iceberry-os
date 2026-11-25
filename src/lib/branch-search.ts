export function normalizeBranchSearch(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").toLowerCase().trim();
}
export function mergeOrderBranches(groups: { branches: { id: string; branchName: string }[] }[], standalone: { id: string; branchName: string }[]) {
  return [...new Map([...standalone, ...groups.flatMap(group => group.branches)].map(branch => [branch.id, branch])).values()]
    .sort((a, b) => a.branchName.localeCompare(b.branchName, "tr"));
}
