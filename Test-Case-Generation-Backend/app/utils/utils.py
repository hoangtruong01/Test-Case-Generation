from typing import Any, List, Iterable


# This function is vibe coded, has been tested but not reviewed
# TODO: Recheck the code and optmize/improve is possible
def _infer_type(value: Any) -> str:
    """
    Infer a human-readable schema type from a Python value.

    Supported types include None, booleans, integers, floats, strings, lists, and dictionaries.

    Returns a string describing the inferred type, such as "null", "boolean", "integer", "number", "string", "array[integer]", "object", or "unknown".
    """

    # Infer a human-readable schema type from a Python value
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return f"array[{_infer_type(value[0])}]" if value else "array[unknown]"
    if isinstance(value, dict):
        return "object"
    return "unknown"


# This function is vibe coded, has been tested but not reviewed
# TODO: Recheck the code and optmize/improve is possible
def inspect_schema(obj: dict, prefix: str = "") -> None:
    """
    Recursively traverse a dictionary and print out the inferred schema type of each value.

    Args:
        obj (dict): A dictionary to be traversed.
        prefix (str, optional): A prefix to be prepended to each key path, if applicable. Defaults to "".
    """

    # Recursively print dot-notation paths with inferred value types
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key
        print(f"{path}: {_infer_type(value)}")

        if isinstance(value, dict):
            inspect_schema(value, path)
        elif isinstance(value, list) and value and isinstance(value[0], dict):
            inspect_schema(value[0], f"{path}[]")


# This function is vibe coded, has been tested but not reviewed
# TODO: Recheck the code and optmize/improve is possible
async def snake_case_to_title(fields: Iterable[str]) -> List[str]:
    """
    Convert a list of snake_case strings into title case strings.

    Args:
        fields (Iterable[str]): A list of strings in snake case format.

    Returns:
        List[str]: A list of strings in title case format.
    """

    # Convert snake_case field names into human-readable title case
    result = []

    for field in fields:
        words = field.split("_")
        capitalized_words = []

        for word in words:
            capitalized_words.append(word.capitalize())

        title = " ".join(capitalized_words)
        result.append(title)

    return result


def format_postman_endpoints_for_llm(endpoints: List[Any]) -> List[str]:
    """
    Turn selected Postman requests into requirement strings for testcase generation.
    """
    lines: List[str] = []
    for ep in endpoints:
        method = (ep.get("method") or "GET").upper()
        url = ep.get("url") or ""
        name = (ep.get("name") or "").strip()
        desc = (ep.get("description") or "").strip()
        folder = (ep.get("folder") or "").strip()
        body = (ep.get("body_excerpt") or "").strip()

        observed_status = ep.get("observed_status_code")
        observed_body = (ep.get("observed_body_excerpt") or "").strip()
        observed_error = (ep.get("observed_error") or "").strip()

        # Emphasize the execution result (what the API actually returned),
        # since the testcase generation should be response-driven.
        status_part = (
            f"Observed response status: {observed_status}"
            if observed_status is not None
            else "Observed response status: unknown"
        )

        if observed_error:
            observed_part = f"Observed error: {observed_error}"
        else:
            if observed_body:
                excerpt = observed_body[:1600] + ("…" if len(observed_body) > 1600 else "")
                observed_part = f"{status_part}; Observed body excerpt: {excerpt}"
            else:
                observed_part = status_part

        request_part = [f"Request: {method} {url}"]
        if name:
            request_part.append(name)
        if folder:
            request_part.append(f"(folder: {folder})")
        if desc:
            request_part.append(f"Notes: {desc}")
        if body:
            excerpt = body[:800] + ("…" if len(body) > 800 else "")
            request_part.append(f"Request body excerpt: {excerpt}")

        parts = [observed_part, *request_part]
        lines.append(" | ".join(parts))
    return lines


async def format_issue_descriptions(issue_descriptions: List[str]) -> List[str]:
    """
    Format a list of issue descriptions into a list of strings with a title case format.

    Args:
        issue_descriptions (List[str]): A list of issue descriptions in snake case format.

    Returns:
        List[str]: A list of strings in title case format.

    Example:
        >>> format_issue_descriptions(["fix bug", "add feature"])
        ["1. Fix Bug", "2. Add Feature"]
    """

    # Prefix issue descriptions with an ordered index for LLM consumption
    result: List[str] = []

    for index, requiremnt in enumerate(issue_descriptions):
        formatted = f"{index+1}. {requiremnt}"
        result.append(formatted)

    return result
