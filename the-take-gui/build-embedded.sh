#!/bin/bash
# Rebuild the portable HTML file
cd "$(dirname "$0")"
npm run build
cp dist/index.html ../The-Take-Explorer-Embedded.html
echo "Successfully built The-Take-Explorer-Embedded.html!"
