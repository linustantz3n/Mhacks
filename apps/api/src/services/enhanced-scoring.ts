import { GoogleGenerativeAI } from '@google/generative-ai';

export type UserProfile = {
  full_name: string;
  schools: Array<{
    institution: string;
    program: string;
    degree: string;
    grad_year: number;
  }>;
  clubs: string[];
  hometown?: string;
  city?: string;
  region?: string;
  country?: string;
  grad_year?: number;
};

export type CandidateInput = {
  id: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  linkedinUrl?: string;
  location?: string;
  summary?: string;
  source?: string;
  schools?: string;
  skills?: string;
  experience?: string;
  rawData?: any;
};

export type ScoredCandidate = CandidateInput & {
  score: number;
  subscores: {
    school: number;
    experience_relevance: number;
    activities: number;
    geography: number;
    mutual_connections: number;
    grad_year_proximity: number;
  };
  evidence: {
    school: string | string[];
    experience_relevance: string | string[];
    activities: string[] | string;
    geography: string;
    mutual_connections: string;
    grad_year_proximity: string;
  };
  reasons: string[];
};

function parseSchoolsFromCSV(schoolsData: string): Array<{institution: string, program: string, degree: string, grad_year: number}> {
  if (!schoolsData || schoolsData === 'NaN' || !schoolsData.startsWith('[')) {
    return [];
  }

  try {
    const schools = JSON.parse(schoolsData);
    return schools.map((school: any) => ({
      institution: school.school || '',
      program: extractProgram(school.degree || ''),
      degree: school.degree || '',
      grad_year: parseGradYear(school.end_date || school.start_date || '')
    }));
  } catch (e) {
    return [];
  }
}

function parseExperienceFromCSV(experienceData: string): Array<{company: string, industry: string, role_title: string, team: string, is_current: boolean}> {
  if (!experienceData || experienceData === 'NaN' || !experienceData.startsWith('[')) {
    return [];
  }

  try {
    const experiences = JSON.parse(experienceData);
    return experiences.map((exp: any) => ({
      company: exp.company || '',
      industry: inferIndustry(exp.company || ''),
      role_title: exp.title || '',
      team: extractTeam(exp.title || ''),
      is_current: !exp.end_date || exp.end_date === null
    }));
  } catch (e) {
    return [];
  }
}

function parseClubsFromBio(bio: string, skills: string): string[] {
  const clubs: string[] = [];
  const bioText = (bio || '').toLowerCase();
  const skillsText = (skills || '').toLowerCase();

  // Common club/organization patterns
  const clubPatterns = [
    /acm/g, /ieee/g, /hackathon/g, /fraternity/g, /sorority/g,
    /debate/g, /volunteer/g, /student government/g, /honor society/g,
    /robotics/g, /chess club/g, /drama/g, /theater/g, /band/g, /choir/g
  ];

  clubPatterns.forEach(pattern => {
    const matches = bioText.match(pattern) || skillsText.match(pattern);
    if (matches) {
      clubs.push(matches[0]);
    }
  });

  return [...new Set(clubs)]; // Remove duplicates
}

function extractProgram(degree: string): string {
  const degreeText = degree.toLowerCase();
  if (degreeText.includes('computer science') || degreeText.includes('cs')) return 'computer science';
  if (degreeText.includes('electrical engineering') || degreeText.includes('ee')) return 'electrical engineering';
  if (degreeText.includes('mechanical engineering') || degreeText.includes('me')) return 'mechanical engineering';
  if (degreeText.includes('business') || degreeText.includes('mba')) return 'business';
  if (degreeText.includes('data science') || degreeText.includes('statistics')) return 'data science';
  return degree;
}

function parseGradYear(dateString: string): number {
  if (!dateString) return 0;
  const year = parseInt(dateString.split('-')[0]);
  return isNaN(year) ? 0 : year;
}

function inferIndustry(company: string): string {
  const companyLower = company.toLowerCase();
  if (['apple', 'google', 'microsoft', 'meta', 'amazon', 'netflix'].includes(companyLower)) return 'technology';
  if (['goldman sachs', 'jp morgan', 'morgan stanley', 'blackrock'].includes(companyLower)) return 'finance';
  if (['mckinsey', 'bain', 'bcg', 'deloitte'].includes(companyLower)) return 'consulting';
  return 'technology'; // Default for now
}

function extractTeam(title: string): string {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('ios')) return 'ios';
  if (titleLower.includes('android')) return 'android';
  if (titleLower.includes('web') || titleLower.includes('frontend')) return 'frontend';
  if (titleLower.includes('backend') || titleLower.includes('api')) return 'backend';
  if (titleLower.includes('data') || titleLower.includes('ml') || titleLower.includes('ai')) return 'data';
  if (titleLower.includes('security')) return 'security';
  if (titleLower.includes('infrastructure') || titleLower.includes('devops')) return 'infrastructure';
  return '';
}

function parseLocationComponents(location: string): {city?: string, region?: string, country?: string} {
  if (!location) return {};

  const parts = location.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    return {
      city: parts[0],
      region: parts[1],
      country: parts[2]
    };
  } else if (parts.length === 2) {
    return {
      city: parts[0],
      region: parts[1],
      country: 'United States' // Default for US locations
    };
  } else {
    return {
      city: parts[0],
      country: 'United States'
    };
  }
}

function transformCandidateForLLM(candidate: CandidateInput): any {
  const locationComponents = parseLocationComponents(candidate.location || '');
  const schools = parseSchoolsFromCSV(candidate.schools || '');
  const experience = parseExperienceFromCSV(candidate.experience || '');
  const clubs = parseClubsFromBio(candidate.summary || '', candidate.skills || '');

  return {
    full_name: candidate.name,
    schools: schools,
    clubs: clubs,
    hometown: locationComponents.city, // Approximation - could be improved with more data
    city: locationComponents.city,
    region: locationComponents.region,
    country: locationComponents.country,
    mutual_count: candidate.rawData?.mutuals || 4, // Default 4 mutual connections as specified
    experience: experience
  };
}

export async function scoreWithLLM(args: {
  user: UserProfile;
  intent: string;
  candidates: CandidateInput[];
  apiKey?: string;
}): Promise<ScoredCandidate[]> {
  const { user, intent, candidates, apiKey } = args;

  if (!apiKey) {
    throw new Error('Google AI API key is required for enhanced scoring');
  }

  // Transform candidates to LLM format
  const llmCandidates = candidates.map(transformCandidateForLLM);

  // Process each candidate individually for better reliability
  const scoredResults = [];

  for (const candidate of llmCandidates) {
    const prompt = `You are a professional LinkedIn recruiter and lead researcher.
Your job is to compute a reproducible compatibility score between two structured profiles:

(A) user_profile → the requester who is looking for connections.

(B) connection_profile → a potential connection to be ranked.

You must use the weighted rubric below to generate subscores, then a total_score, and finally return only the specified JSON output.

🚦 Absolute Rules

Use only the provided fields.

Never invent facts. If a field is missing, subscore = 0 and evidence = "missing".

Never browse or lookup external info.

Never include reasoning, steps, or chain-of-thought. Only return the required JSON object.

Normalize text before comparison: lowercase, strip punctuation/accents, trim whitespace.

Canonicalize aliases:

umich = university of michigan, uiuc = university of illinois urbana-champaign

swe = sde = software engineer, ml eng = machine learning engineer

tiktok = bytedance, google = google llc, etc.

Typo tolerance: treat strings as equal if Damerau–Levenshtein distance ≤1 (≤10 chars) or ≤2 (>10 chars).

If multiple values exist (e.g., multiple schools, jobs, clubs), use the single best match for scoring.

Evidence must contain only direct tokens/phrases copied from input fields or "missing".

⚖️ Weighted Rubric

The final score is a weighted sum of subscores.

total_score = round(
   0.28*school
 + 0.24*experience_relevance
 + 0.18*activities
 + 0.12*geography
 + 0.10*mutual_connections
 + 0.08*grad_year_proximity,
 4)

1. School (weight 0.28)

1.0 = same institution and same program/degree.

0.85 = same institution (program different/unspecified).

0.70 = same university system/network (explicitly indicated, e.g., UC system).

0.40 = same field of study/major, different institution.

0.0 = no match.

If multiple schools, take the maximum subscore.
Evidence: exact school/program strings that matched, or "missing".

2. Experience Relevance (weight 0.24)

Evaluate against the most relevant current or most recent job. Canonicalize roles.

1.0 = same role and same company (team/keyword also matches if intent specifies).

0.85 = same role + same company.

0.70 = same role, different company, same industry.

0.50 = adjacent role (e.g., Eng Manager/Tech Lead) at same company or team.

0.25 = same company, unrelated role.

0.0 = otherwise.

Evidence: role/company/team tokens, or "missing".

3. Activities / Clubs (weight 0.18)

Compare extracurriculars/organizations.

1.0 = ≥2 exact overlaps.

0.60 = 1 exact overlap.

0.40 = same category (e.g., "ACM" ~ "CS club") if category labels exist.

0.0 = no overlap.

Evidence: matched club/org tokens, or "missing".

4. Geography (weight 0.12)

Hierarchy of specificity (use the most precise match available):

1.0 = same hometown or high school location.

0.80 = same city.

0.60 = same metro area (explicit in fields).

0.40 = same state/region.

0.20 = same country.

0.0 = no match.

Evidence: matched location string, or "missing".

5. Mutual Connections (weight 0.10)

If mutual_count is provided:

subscore = min(1.0, mutual_count / 5)

Else → 0.0.
Evidence: mutual_count as string, or "missing".

6. Graduation Year Proximity (weight 0.08)

Let Δ = |user_grad_year − connection_grad_year|.

1.0 = Δ = 0.

0.8 = Δ = 1.

0.6 = Δ = 2.

0.3 = Δ ∈ [3..5].

0.0 = Δ > 5 or missing.

Evidence: the grad years used, or "missing".

Input:
${JSON.stringify({
  user_profile: user,
  connection_profile: candidate
}, null, 2)}

Return only the JSON object with this exact structure:
{
  "connection_full_name": "string",
  "subscores": {
    "school": 0.0,
    "experience_relevance": 0.0,
    "activities": 0.0,
    "geography": 0.0,
    "mutual_connections": 0.0,
    "grad_year_proximity": 0.0
  },
  "total_score": 0.0,
  "evidence": {
    "school": "string or [strings] or \"missing\"",
    "experience_relevance": "string or [strings] or \"missing\"",
    "activities": ["..."] or "missing",
    "geography": "string or \"missing\"",
    "mutual_connections": "string or \"missing\"",
    "grad_year_proximity": "string or \"missing\""
  }
}`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      const llmResult = JSON.parse(text);
      scoredResults.push(llmResult);

    } catch (error) {
      console.error(`Failed to score candidate ${candidate.full_name}:`, error);
      // Add fallback score for this candidate
      scoredResults.push({
        connection_full_name: candidate.full_name,
        subscores: {
          school: 0,
          experience_relevance: 0,
          activities: 0,
          geography: 0,
          mutual_connections: 0,
          grad_year_proximity: 0
        },
        total_score: 0,
        evidence: {
          school: "error",
          experience_relevance: "error",
          activities: "error",
          geography: "error",
          mutual_connections: "error",
          grad_year_proximity: "error"
        }
      });
    }
  }

  // Sort results by total score
  scoredResults.sort((a, b) => b.total_score - a.total_score);

  // Map back to our candidates with scores
  const scoredCandidates: ScoredCandidate[] = candidates.map((candidate, index) => {
    const llmResult = scoredResults.find((r: any) => r.connection_full_name === candidate.name);

    if (llmResult) {
      return {
        ...candidate,
        score: llmResult.total_score,
        subscores: llmResult.subscores,
        evidence: llmResult.evidence,
        reasons: Object.keys(llmResult.subscores).filter(key => llmResult.subscores[key] > 0)
      };
    } else {
      // Fallback if LLM didn't return this candidate
      return {
        ...candidate,
        score: 0,
        subscores: {
          school: 0,
          experience_relevance: 0,
          activities: 0,
          geography: 0,
          mutual_connections: 0,
          grad_year_proximity: 0
        },
        evidence: {
          school: 'missing',
          experience_relevance: 'missing',
          activities: 'missing',
          geography: 'missing',
          mutual_connections: 'missing',
          grad_year_proximity: 'missing'
        },
        reasons: []
      };
    }
  });

  return scoredCandidates.sort((a, b) => b.score - a.score);
}

// Fallback to simple scoring if LLM fails
export function fallbackScoring(args: {
  user: UserProfile;
  intent: string;
  candidates: CandidateInput[];
}): ScoredCandidate[] {
  const { candidates } = args;

  return candidates.map(candidate => ({
    ...candidate,
    score: Math.random() * 0.5, // Low random score as fallback
    subscores: {
      school: 0,
      experience_relevance: 0,
      activities: 0,
      geography: 0,
      mutual_connections: 0,
      grad_year_proximity: 0
    },
    evidence: {
      school: 'fallback',
      experience_relevance: 'fallback',
      activities: 'fallback',
      geography: 'fallback',
      mutual_connections: 'fallback',
      grad_year_proximity: 'fallback'
    },
    reasons: ['fallback-scoring']
  })).sort((a, b) => b.score - a.score);
}