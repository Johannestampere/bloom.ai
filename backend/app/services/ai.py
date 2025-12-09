# services/ai.py
from typing import List, Dict
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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

Generate {suggestions_count} concise child node ideas that could logically branch
from the LAST item.

Rules:
- 2-6 words per idea
- noun phrases only
- no explanations
- no numbering
- no punctuation at the end
- no repetition

Respond as a plain list, one idea per line.
""".strip()


def generate_node_suggestions(
    context_nodes: List[Dict[str, str]],
    suggestions_count: int = 5,
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
            {"role": "system", "content": "You are a concise ideation assistant."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )

    raw_text = response.choices[0].message.content.strip()

    suggestions = []

    # Split the raw text into lines and strip any whitespace
    for line in raw_text.split("\n"):
        line = line.strip("•- \t")
        if line:
            suggestions.append({"title": line})

    return suggestions