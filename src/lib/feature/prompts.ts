export function buildClarifierPrompt(prdContent: string, featureDescription: string): string {
  return `You are a technical product manager. Given the existing PRD and a new feature request, generate 3–5 targeted clarifying questions to fully understand the feature scope.

## Existing PRD
${prdContent}

## Feature Request
${featureDescription}

Respond with ONLY a JSON array of question strings, for example:
["What problem does this feature solve?", "Who is the primary user?"]

Output ONLY valid JSON. No markdown, no explanation.`
}

export function buildSpecPrompt(
  prdContent: string,
  featureDescription: string,
  qa: { question: string; answer: string }[],
): string {
  const qaBlock = qa.map((pair) => `Q: ${pair.question}\nA: ${pair.answer}`).join('\n\n')

  return `You are a senior software architect. Given the existing PRD, a feature request, and clarifying Q&A, generate a feature specification and implementation tasks.

## Existing PRD
${prdContent}

## Feature Request
${featureDescription}

## Clarifying Q&A
${qaBlock}

Respond with ONLY a valid JSON object matching this exact shape:

{
  "spec": "markdown string with the feature specification",
  "tasks": [
    {
      "title": "Short task title",
      "description": "Detailed description of what to implement",
      "category": "functional",
      "passes": false,
      "passCondition": "How to verify this task is complete"
    }
  ]
}

Valid categories: functional, ui-ux, api-endpoint, security, testing, config, docs

Example output:

{
  "spec": "### User Authentication\\n\\nAdd JWT-based authentication with login and signup endpoints.\\n\\n#### Requirements\\n- POST /api/auth/login\\n- POST /api/auth/signup\\n- JWT tokens with 24h expiry",
  "tasks": [
    {
      "title": "Create auth middleware",
      "description": "Create src/middleware/auth.ts that validates JWT tokens from the Authorization header.",
      "category": "security",
      "passes": false,
      "passCondition": "Middleware rejects requests without valid JWT; passes requests with valid JWT"
    },
    {
      "title": "Add login endpoint",
      "description": "Create POST /api/auth/login that accepts email/password and returns a JWT.",
      "category": "api-endpoint",
      "passes": false,
      "passCondition": "POST /api/auth/login returns 200 with token for valid credentials, 401 for invalid"
    }
  ]
}

Output ONLY valid JSON. No markdown fences, no explanation.`
}

export const SEED_QUESTIONS = [
  'What problem does this feature solve?',
  'Who is the primary user?',
  'Are UI components needed or is this backend-only?',
  'Does this depend on any existing tasks?',
  'Any known edge cases or constraints?',
]
