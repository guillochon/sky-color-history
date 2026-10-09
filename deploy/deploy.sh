#!/bin/sh
# Copy the built site to earthsky.astrocrash.net (nginx/earthsky.astrocrash.net serves it).
# Build it first: cd model && uv run gen_site.py (which also writes the .gz copies).
# Arguments go on to rsync, so `deploy/deploy.sh -n` is a dry run.
# Files on the server that are not in site/ are deleted.
set -eu
cd "$(dirname "$0")/.."
HOST=${EARTHSKY_HOST:-astrocrash.net}
DEST=/var/www/html/earthsky/
rsync -avz --delete --exclude '_ffdebug.html' --exclude '.DS_Store' "$@" site/ "$HOST:$DEST"
