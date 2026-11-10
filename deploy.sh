#!/usr/bin/env bash
# gobble-by-pixie-site manual deploy fallback (use when GitHub is down).
#
# Normal deploys are git-driven: push to main -> CF Pages auto-builds.
# This script replicates that build locally and deploys the result
# directly, creating an out-of-band deployment in the CF dashboard.
#
# IMPORTANT (see _Secrets reference, Account 3): OAuth login is the ONLY
# auth that works for this project - API-token auth is broken (wrangler
# 4.x bug). One-time prereq:  npx wrangler login   (client's account)
# Verify identity:  npx wrangler whoami
set -euo pipefail
cd "$(dirname "$0")"

echo "[1/3] Building..."
npx astro build

echo "[2/3] Assembling Pages worker (mirrors the CF Pages build command)..."
cp -r dist/server/chunks dist/client/chunks
cp dist/server/entry.mjs dist/client/_worker.js
cp dist/server/virtual_astro_middleware.mjs dist/client/
# DO NOT delete dist/server/wrangler.json — measured 2026-11-06 (mane's
# README records the same): on this adapter version wrangler HARD-FAILS when
# the config is missing from the server output. The copy above already put
# the worker where the deploy step reads it.

echo "[3/3] Deploying to CF Pages project: gobble-by-pixie-site"
npx wrangler pages deploy dist/client --project-name gobble-by-pixie-site --branch main

echo "Done. Verify https://gobblebypixie.com/ before trusting the deploy."
