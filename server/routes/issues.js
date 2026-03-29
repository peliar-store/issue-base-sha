import { Router } from "express";
import { Octokit } from "octokit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "../data/cache.json");

function readCache() {
  const raw = fs.readFileSync(CACHE_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeCache(data) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  return new Octokit({ auth: token });
}

// Helper: find merged PR linked to an issue and return its baseSha
async function findLinkedPR(octokit, owner, repo, issue_number) {
  let linkedPR = null;
  let baseSha = null;

  // Strategy 1: GraphQL timeline events
  try {
    const query = `query($owner: String!, $repo: String!, $num: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $num) {
          timelineItems(itemTypes: [CONNECTED_EVENT, CROSS_REFERENCED_EVENT, CLOSED_EVENT], first: 50) {
            nodes {
              __typename
              ... on ConnectedEvent {
                subject { ... on PullRequest { number title merged url baseRefOid changedFiles } }
              }
              ... on CrossReferencedEvent {
                source { ... on PullRequest { number title merged url baseRefOid changedFiles } }
              }
              ... on ClosedEvent {
                closer { ... on PullRequest { number title merged url baseRefOid changedFiles } }
              }
            }
          }
        }
      }
    }`;

    const gqlResult = await octokit.graphql(query, {
      owner,
      repo,
      num: Number(issue_number),
    });

    const nodes = gqlResult.repository.issue.timelineItems.nodes;
    for (const node of nodes) {
      let pr = null;
      if (node.__typename === "ConnectedEvent") pr = node.subject;
      if (node.__typename === "CrossReferencedEvent") pr = node.source;
      if (node.__typename === "ClosedEvent") pr = node.closer;

      if (pr && pr.merged) {
        linkedPR = {
          number: pr.number,
          title: pr.title,
          url: pr.url,
          merged: true,
          changedFiles: pr.changedFiles,
        };
        baseSha = pr.baseRefOid;
        break;
      }
    }
  } catch (gqlErr) {
    console.error("GraphQL failed:", gqlErr.message);
  }

  // Strategy 2: REST search fallback
  if (!linkedPR) {
    try {
      const { data: search } =
        await octokit.rest.search.issuesAndPullRequests({
          q: `repo:${owner}/${repo} is:pr is:merged ${issue_number}`,
        });

      for (const item of search.items) {
        const { data: pr } = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: item.number,
        });
        if (pr.merged) {
          linkedPR = {
            number: pr.number,
            title: pr.title,
            url: pr.html_url,
            merged: true,
            changedFiles: pr.changed_files,
          };
          baseSha = pr.base.sha;
          break;
        }
      }
    } catch (searchErr) {
      console.error("Search failed:", searchErr.message);
    }
  }

  return { linkedPR, baseSha };
}

// GET /api/issues/:owner/:repo/list - fast: just the issue list + dockerfile check
router.get("/:owner/:repo/list", async (req, res) => {
  const { owner, repo } = req.params;

  try {
    const octokit = getOctokit();

    // Fetch repo metadata: Dockerfile + primary language
    let hasDockerfile = false;
    try {
      await octokit.rest.repos.getContent({ owner, repo, path: "Dockerfile" });
      hasDockerfile = true;
    } catch {
      hasDockerfile = false;
    }

    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const mainLanguage = repoData.language || null;
    let repoCategory = "Other";
    if (mainLanguage) {
      const lang = mainLanguage.toLowerCase();
      if (lang === "python") repoCategory = "Python";
      else if (lang === "javascript") repoCategory = "JavaScript";
      else if (lang === "typescript") repoCategory = "TypeScript";
      else repoCategory = mainLanguage;
    }

    // Fetch all issues (not PRs) with pagination
    const allIssues = [];
    let page = 1;
    while (true) {
      const { data: pageIssues } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: "all",
        per_page: 100,
        page,
      });
      if (pageIssues.length === 0) break;
      for (const issue of pageIssues) {
        if (!issue.pull_request) {
          allIssues.push({
            issueId: issue.number,
            issueLink: issue.html_url,
            issueTitle: issue.title,
          });
        }
      }
      if (pageIssues.length < 100) break;
      page++;
    }

    res.json({
      repo: `${owner}/${repo}`,
      hasDockerfile,
      repoCategory,
      totalIssues: allIssues.length,
      issues: allIssues,
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: "Repository not found" });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/issues/:owner/:repo/:issue_number/details - slow: baseSha + fileChangedCount + file names
router.get("/:owner/:repo/:issue_number/details", async (req, res) => {
  const { owner, repo, issue_number } = req.params;
  const cacheKey = `${owner}/${repo}#${issue_number}`;

  try {
    const cache = readCache();
    if (
      cache[cacheKey] &&
      cache[cacheKey].fileChangedCount !== undefined &&
      cache[cacheKey].changedFileNames !== undefined
    ) {
      return res.json({
        issueId: Number(issue_number),
        baseSha: cache[cacheKey].baseSha,
        fileChangedCount: cache[cacheKey].fileChangedCount,
        changedFileNames: cache[cacheKey].changedFileNames,
        prLink: cache[cacheKey].linkedPR?.url ?? null,
        cached: true,
      });
    }

    const octokit = getOctokit();
    const { linkedPR, baseSha } = await findLinkedPR(
      octokit,
      owner,
      repo,
      issue_number
    );

    const fileChangedCount = linkedPR?.changedFiles ?? null;
    let changedFileNames = [];
    let prLink = null;

    if (linkedPR) {
      prLink = linkedPR.url;
      // Fetch the list of files changed in the PR
      try {
        const { data: files } = await octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: linkedPR.number,
          per_page: 100,
        });
        changedFileNames = files.map((f) => f.filename);
      } catch (e) {
        console.error("Failed to fetch PR files:", e.message);
      }
    }

    cache[cacheKey] = {
      issue: { number: Number(issue_number) },
      linkedPR,
      baseSha,
      fileChangedCount,
      changedFileNames,
      fetchedAt: new Date().toISOString(),
    };
    writeCache(cache);

    res.json({
      issueId: Number(issue_number),
      baseSha,
      fileChangedCount,
      changedFileNames,
      prLink,
      cached: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/issues/:owner/:repo/:issue_number - single issue lookup (legacy)
router.get("/:owner/:repo/:issue_number", async (req, res) => {
  const { owner, repo, issue_number } = req.params;
  const cacheKey = `${owner}/${repo}#${issue_number}`;

  try {
    const cache = readCache();
    if (cache[cacheKey]) {
      return res.json({ ...cache[cacheKey], cached: true });
    }

    const octokit = getOctokit();

    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: Number(issue_number),
    });

    const { linkedPR, baseSha } = await findLinkedPR(
      octokit,
      owner,
      repo,
      issue_number
    );

    const result = {
      issue: { number: issue.number, title: issue.title, url: issue.html_url },
      linkedPR,
      baseSha,
      fileChangedCount: linkedPR?.changedFiles ?? null,
      fetchedAt: new Date().toISOString(),
    };

    cache[cacheKey] = result;
    writeCache(cache);

    res.json({ ...result, cached: false });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: "Issue not found" });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
