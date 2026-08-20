#!/bin/bash
set -e

# Setup any necessary environment or permissions before execution
# For strict sandbox, we just execute the passed command
exec "$@"
