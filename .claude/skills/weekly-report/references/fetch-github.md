# Fetch GitHub Activity

Read the producer's PRs, issues, and commits from GitHub using `gh` CLI.

## Prerequisites
- `gh auth status` must pass
- `GITHUB_USERNAME` from `.env`

## Queries

Substitute `{GITHUB_USERNAME}` and `{W_start}` from the pipeline.

### PRs
```
gh search prs --author={GITHUB_USERNAME} --updated=">={W_start}" --json repository,number,title,state,url,updatedAt --limit 50
```

### Issues
```
gh search issues --author={GITHUB_USERNAME} --updated=">={W_start}" --json repository,number,title,state,url,updatedAt --limit 50
```

### Commits
```
gh api "search/commits?q=author:{GITHUB_USERNAME}+committer-date:>={W_start}" -H "Accept: application/vnd.github.cloak-preview+json"
```

### Fallback (if commits API fails)
```
gh repo list --limit 100 --json nameWithOwner
```
Then for each `<owner>/<repo>`:
```
gh api "repos/<owner>/<repo>/commits?author={GITHUB_USERNAME}&since={W_start}"
```

## Output

Keep raw JSON. Do NOT summarize — that happens at the draft step.

## Fallback

If `gh auth status` fails, STOP the entire pipeline (GitHub is required).
