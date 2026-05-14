#!/bin/bash
# Promise tags module for rocket.sh
# Semantic signals for agent communication
# Dependencies: None
#
# Rocket tags allow the AI agent to communicate status to the loop controller.
# The script detects these tags in the agent's output to determine next actions.
#
# Tag Format:
#   <complete>
#   <blocked>reason</blocked>
#   <decide>question</decide>
#
# Available Tags:
#   <complete>                 - All tasks finished successfully
#   <blocked>reason</blocked>  - Agent is blocked and needs human help
#   <decide>question</decide>  - Agent needs human decision/clarification
#
# Examples:
#   <complete>
#   <blocked>Missing API credentials for external service</blocked>
#   <decide>Should we use REST or GraphQL for the new endpoint?</decide>

# Regex patterns for promise tags
PROMISE_COMPLETE_PATTERN='<promise>COMPLETE</promise>'
PROMISE_BLOCKED_PATTERN='<promise>BLOCKED:[^<]*</promise>'
PROMISE_DECIDE_PATTERN='<promise>DECIDE:[^<]*</promise>'
ROCKET_COMPLETE_PATTERN='<complete>'
ROCKET_BLOCKED_PATTERN='<blocked>[^<]*</blocked>'
ROCKET_DECIDE_PATTERN='<decide>[^<]*</decide>'

# Check if output contains a COMPLETE tag
# Usage: if has_complete_tag "$output"; then ...
has_complete_tag() {
  local output="$1"
  echo "$output" | grep -q "$ROCKET_COMPLETE_PATTERN" || echo "$output" | grep -q "$PROMISE_COMPLETE_PATTERN"
}

# Check if output contains a BLOCKED tag
# Usage: if has_blocked_tag "$output"; then ...
has_blocked_tag() {
  local output="$1"
  echo "$output" | grep -qE "$ROCKET_BLOCKED_PATTERN" || echo "$output" | grep -qE "$PROMISE_BLOCKED_PATTERN"
}

# Check if output contains a DECIDE tag
# Usage: if has_decide_tag "$output"; then ...
has_decide_tag() {
  local output="$1"
  echo "$output" | grep -qE "$ROCKET_DECIDE_PATTERN" || echo "$output" | grep -qE "$PROMISE_DECIDE_PATTERN"
}

# Extract the reason from a BLOCKED tag
# Usage: reason=$(extract_blocked_reason "$output")
# Returns: the reason string, or empty if no tag found
extract_blocked_reason() {
  local output="$1"
  local rocket_match=$(echo "$output" | grep -oE "$ROCKET_BLOCKED_PATTERN" | head -1)
  if [ -n "$rocket_match" ]; then
    echo "$rocket_match" | sed 's/<blocked>//;s/<\/blocked>//'
    return
  fi

  local match=$(echo "$output" | grep -oE "$PROMISE_BLOCKED_PATTERN" | head -1)
  if [ -n "$match" ]; then
    # Extract content between BLOCKED: and </promise>
    echo "$match" | sed 's/<promise>BLOCKED://;s/<\/promise>//'
  fi
}

# Extract the question from a DECIDE tag
# Usage: question=$(extract_decide_question "$output")
# Returns: the question string, or empty if no tag found
extract_decide_question() {
  local output="$1"
  local rocket_match=$(echo "$output" | grep -oE "$ROCKET_DECIDE_PATTERN" | head -1)
  if [ -n "$rocket_match" ]; then
    echo "$rocket_match" | sed 's/<decide>//;s/<\/decide>//'
    return
  fi

  local match=$(echo "$output" | grep -oE "$PROMISE_DECIDE_PATTERN" | head -1)
  if [ -n "$match" ]; then
    # Extract content between DECIDE: and </promise>
    echo "$match" | sed 's/<promise>DECIDE://;s/<\/promise>//'
  fi
}

# Check if output contains any help-needed tag (BLOCKED or DECIDE)
# Usage: if needs_help "$output"; then ...
needs_help() {
  local output="$1"
  has_blocked_tag "$output" || has_decide_tag "$output"
}
