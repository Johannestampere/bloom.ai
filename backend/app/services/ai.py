import json
from typing import List, Dict
from ..core.config import settings
from openai import OpenAI

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def _build_prompt(context_nodes: List[Dict[str, str]], suggestions_count: int) -> str:
    """
    Build a prompt that asks the LLM for suggestions for the branch.
    """
    context_lines = []

    for node in context_nodes:
        title = node["title"]
        content = node.get("content")
        if content:
            context_lines.append(f"- {title}: {content}")
        else:
            context_lines.append(f"- {title}")

    context_text = "\n".join(context_lines)

    return f"""
You are helping a team brainstorm a mindmap.

The following is a path from the main idea down to a sub-idea:

{context_text}

Generate {suggestions_count} child node ideas that could logically branch from the LAST item.

For each idea, provide:
- title: A concise noun phrase (2-6 words)
- content: A brief explanation or details (1-2 sentences)

Rules:
- No numbering or bullet points
- No repetition between ideas
- Make content actionable and specific

Respond as a JSON array with objects containing "title" and "content" fields.
Example format:
[
  {{"title": "Example Title", "content": "Brief explanation of this idea."}},
  {{"title": "Another Title", "content": "Details about this concept."}}
]
""".strip()


def generate_node_suggestions(
    context_nodes: List[Dict[str, str]],
    suggestions_count: int = 3,
    model: str = "gpt-4o-mini"
) -> List[Dict[str, str]]:
    """
    Generate AI-based node suggestions given a branch context.
    Returns lightweight dicts compatible with AISuggestion.
    """
    if not context_nodes:
        return []

    prompt = _build_prompt(context_nodes, suggestions_count)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a concise ideation assistant. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )

    raw_text = response.choices[0].message.content.strip()

    # Parse JSON response
    try:
        # Handle potential markdown code blocks
        if raw_text.startswith("```"):
            # Remove markdown code block markers
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        suggestions = json.loads(raw_text)

        # Validate structure
        if isinstance(suggestions, list):
            return [
                {"title": s.get("title", ""), "content": s.get("content", "")}
                for s in suggestions
                if isinstance(s, dict) and s.get("title")
            ]
    except json.JSONDecodeError:
        # Fallback: try to parse line by line if JSON fails
        suggestions = []
        for line in raw_text.split("\n"):
            line = line.strip("•- \t")
            if line:
                suggestions.append({"title": line, "content": ""})
        return suggestions

    return []