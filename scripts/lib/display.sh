#!/bin/bash
# Display module for rocket.sh
# UI elements, ASCII art, and help display
# Dependencies: constants.sh, timing.sh

# Display BLOCKED message with reason and resume instructions
# Usage: display_blocked_message "reason" iteration_number
display_blocked_message() {
  local reason="$1"
  local iteration="$2"

  echo ""
  echo -e "${RD}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
  echo -e "  🚫 ${RD}Agent is BLOCKED${R}"
  echo -e "${RD}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
  echo ""
  echo -e "  ${Y}Reason:${R}"
  echo -e "    $reason"
  echo ""
  echo -e "  ${C}How to resume:${R}"
  echo -e "    1. Resolve the blocking issue described above"
  echo -e "    2. Run ${GR}./rocket.sh${R} to continue from where you left off"
  echo ""
  echo -e "  ${G}Stopped at iteration ${Y}$iteration${R}"
  echo ""
}

# Display DECIDE message with question and resume instructions
# Usage: display_decide_message "question" iteration_number
display_decide_message() {
  local question="$1"
  local iteration="$2"

  echo ""
  echo -e "${M}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
  echo -e "  ❓ ${M}Agent needs a DECISION${R}"
  echo -e "${M}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
  echo ""
  echo -e "  ${Y}Question:${R}"
  echo -e "    $question"
  echo ""
  echo -e "  ${C}How to answer and resume:${R}"
  echo -e "    1. Make a decision about the question above"
  echo -e "    2. Update the relevant files or configuration"
  echo -e "    3. Run ${GR}./rocket.sh${R} to continue with your decision"
  echo ""
  echo -e "  ${G}Stopped at iteration ${Y}$iteration${R}"
  echo ""
}

# Rocket launch banner
show_rocket() {
  echo ""
  echo -e "${Y}"
  cat << 'ROCKET'

██████╗  ██████╗  ██████╗██╗  ██╗███████╗████████╗
██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝
██████╔╝██║   ██║██║     █████╔╝ █████╗     ██║
██╔══██╗██║   ██║██║     ██╔═██╗ ██╔══╝     ██║
██║  ██║╚██████╔╝╚██████╗██║  ██╗███████╗   ██║
╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝

        /\
       /  \
      /____\
      |    |
      | AI |
      |____|
       /||\
      /_||_\

ROCKET
  echo -e "${R}"
  echo -e "${C}░░▒▒▓▓ Rocket Loop ・ Long-running AI agents ▓▓▒▒░░${R}"
  echo -e "═══════════════════════════════════════════════════════════"
}

# Show help and instructions
show_help() {
  show_rocket
  echo ""
  echo -e "${Y}Usage:${R} ./rocket.sh [options] [max_iterations]"
  echo ""
  echo -e "${Y}Options:${R}"
  echo "  --max-iterations N, -n N    Set maximum iterations (default: 10)"
  echo "  --once                      Run exactly 1 iteration (overrides --max-iterations)"
  echo "  --help, -h                  Show this help message and exit"
  echo ""
  echo -e "${Y}Arguments:${R}"
  echo "  max_iterations    Maximum number of iterations (positional, default: 10)"
  echo ""
  echo -e "${Y}Examples:${R}"
  echo "  ./rocket.sh                      Run with default 10 iterations"
  echo "  ./rocket.sh 5                    Run with 5 iterations max"
  echo "  ./rocket.sh -n 5                 Run with 5 iterations max"
  echo "  ./rocket.sh --max-iterations 5   Same as above"
  echo "  ./rocket.sh --once               Run exactly 1 iteration"
  echo ""
  echo -e "${Y}Files:${R}"
  echo "  📁 .agent/history/         Iteration output logs"
  echo "  📋 .agent/logs/LOG.md      Progress log file"
  echo "  📄 .agent/prd/PRD.md       PRD file with task definitions"
  echo "  📄 .agent/tasks/           Detailed task descriptions"
  echo "  📝 .agent/PROMPT.md        Prompt sent to Claude each iteration"
  echo "  📄 .agent/tasks.json       Task lookup table"
  echo ""
  echo -e "${Y}Behavior:${R}"
  echo "  🤔 Decides on what tasks to pick from .agent/tasks.json"
  echo "  📋 Logs progress to .agent/logs/LOG.md"
  echo "  🎉 Exits early if Claude outputs <complete>"
  echo "  🖼️ Takes screenshots of progress"
  echo ""
  echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}"
  echo -e "${Y}📚 Getting Started:${R}"
  echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}"
  echo ""
  echo -e "  ${C}Step 1:${R} Create a PRD using the prd-creator skill"
  echo -e "         ${G}Dump your requirements and ask AI to use the prd-creator skill${R}"
  echo ""
  echo -e "  ${C}Step 2:${R} Ensure your .agent/ directory has the required files:"
  echo "         📄 .agent/prd/PRD.md        Your product requirements"
  echo "         📄 .agent/prd/SUMMARY.md    Short project overview"
  echo "         📋 .agent/tasks.json        Generated task list"
  echo "         📁 .agent/tasks/            Individual task specs (TASK-{ID}.json)"
  echo "         📝 .agent/PROMPT.md         Agent instructions"
  echo "         📋 .agent/logs/LOG.md       Progress log (auto-created)"
  echo ""
  echo -e "  ${C}Step 3:${R} Run Rocket!"
  echo -e "         ${G}./rocket.sh${R}              # Start the agent loop"
  echo ""
  echo -e "${Y}🔄 How it works:${R}"
  echo "  Each iteration, Rocket will:"
  echo "  1. Find the highest-priority incomplete task in tasks.json"
  echo "  2. Work through the task steps in .agent/tasks/TASK-{ID}.json"
  echo "  3. Run tests, linting, and type checking"
  echo "  4. Update task status and commit changes"
  echo "  5. Repeat until all tasks pass or max iterations reached"
  echo ""
  exit 0
}
