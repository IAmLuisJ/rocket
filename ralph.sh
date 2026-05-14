#!/bin/bash
# Compatibility wrapper. Use ./rocket.sh directly for the Rocket loop.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/rocket.sh" "$@"
