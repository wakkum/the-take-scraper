#!/bin/bash
# Rebuild the portable HTML file
cd "$(dirname "$0")"
npm run build
cp dist/index.html ../The-Take-Explorer-Embedded.html
cp dist/index.html ../the-take-explorer.html
cp dist/index.html ../index.html
echo "Successfully built explorer HTML files!"
