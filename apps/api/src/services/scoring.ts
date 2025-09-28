export type UserProfile = {
  summary?: string;
  schools?: string[];
  companies?: string[];
  skills?: string[];
};

export type Candidate = {
  id: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  linkedinUrl?: string;
  location?: string;
  summary?: string;
  source?: string;
};

function textContains(a?: string, b?: string) {
  if (!a || !b) return false;
  return a.toLowerCase().includes(b.toLowerCase());
}

function tokenOverlap(a: string[] = [], b: string[] = []) {
  const A = new Set(a.map((x) => x.toLowerCase()));
  const B = new Set(b.map((x) => x.toLowerCase()));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const denom = Math.max(1, A.size + B.size - inter);
  return inter / denom; // Jaccard-like
}

export function scoreCandidates(args: { user: UserProfile; intent: string; candidates: Candidate[] }) {
  const { user, intent, candidates } = args;
  const roleHints = ['engineer', 'software', 'swe', 'data', 'ml', 'ai', 'product', 'pm', 'designer'];
  const intentRole = roleHints.find((h) => textContains(intent, h));
  const intentCompanyMatch = /at\s+([A-Za-z0-9\-\.& ]+)/i.exec(intent || '')?.[1]?.trim();

  const scored = candidates.map((c) => {
    let score = 0;
    const reasons: string[] = [];

    // Schools and companies affinity (PRIORITIZED FOR UMICH STUDENTS)
    let hasAlumniAffinity = false;
    if (user.schools && user.schools.length > 0) {
      for (const s of user.schools) {
        if (textContains(c.summary, s) || textContains(c.company, s)) {
          score += 0.4; // MAJOR boost for University of Michigan alumni
          reasons.push('alumni-affinity');
          hasAlumniAffinity = true;
          break;
        }
      }
    }

    // Role/title similarity
    if (intentRole && textContains(c.title, intentRole)) {
      score += hasAlumniAffinity ? 0.2 : 0.25; // Slightly lower for alumni since they already get big boost
      reasons.push('role-match');
    }

    // Company match
    if (intentCompanyMatch && textContains(c.company, intentCompanyMatch)) {
      score += hasAlumniAffinity ? 0.15 : 0.2; // Slightly lower for alumni since they already get big boost
      reasons.push('company-match');
    }

    // Summary overlap with intent keywords
    const sumHit = intent
      .split(/\W+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .some((w) => textContains(c.summary, w));
    if (sumHit) {
      score += 0.1; // Reduced importance
      reasons.push('summary-overlap');
    }

    // Skills overlap (if we had them)
    const skillsOverlap = tokenOverlap(user.skills || [], (c.summary || '').toLowerCase().split(/\W+/));
    if (skillsOverlap > 0) {
      score += Math.min(0.1, skillsOverlap * 0.1); // Reduced importance
      reasons.push('skills-overlap');
    }

    if (user.companies && user.companies.length > 0 && c.company) {
      for (const comp of user.companies) {
        if (textContains(c.company, comp)) {
          score += 0.1;
          reasons.push('company-affinity');
          break;
        }
      }
    }

    // Clamp
    score = Math.max(0, Math.min(1, score));

    return {
      ...c,
      score,
      reasons,
    };
  });

  // Sort by score (highest first)
  return scored.sort((a, b) => b.score - a.score);
}
