import Anthropic from '@anthropic-ai/sdk';

// Zero-arg client resolves ANTHROPIC_API_KEY / auth profiles from the
// environment; constructed lazily so a missing key doesn't crash boot.
let client = null;
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ timeout: 15_000, maxRetries: 1 });
  return client;
};

export const funFactsConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Distill genuinely fun facts from a Wikipedia article with Claude.
 * Returns a string of 2-3 punchy facts, or null when the model isn't
 * configured or the call fails — callers fall back to the plain summary.
 */
export const distillFunFacts = async (placeName, articleText) => {
  const anthropic = getClient();
  if (!anthropic || !articleText) return null;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system:
        'You write fun facts for a playful trip-planning app. Travelers see these ' +
        'facts during an animated replay of their journey, so they should spark a ' +
        '"wait, really?" reaction — surprising trivia, quirky history, records, ' +
        'legends, oddities. Never lead with basic encyclopedia facts (what the ' +
        'place is, where it is, when it was built) unless the detail itself is ' +
        'astonishing. Only use facts supported by the provided article text.',
      messages: [
        {
          role: 'user',
          content:
            `Place: ${placeName}\n\nArticle:\n${articleText}\n\n` +
            'Write 2-3 genuinely fun facts about this place. Each fact is one short ' +
            'sentence. Separate facts with a space, no bullets or numbering, no preamble.',
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              fun_facts: {
                type: 'string',
                description: 'The 2-3 fun facts as one short paragraph',
              },
            },
            required: ['fun_facts'],
            additionalProperties: false,
          },
        },
      },
    });

    const text = response.content.find((block) => block.type === 'text')?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    return parsed.fun_facts || null;
  } catch (error) {
    console.error('[FunFacts] ✗ Claude distillation failed:', error.message);
    return null;
  }
};
