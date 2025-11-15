import { readFileSync, writeFileSync } from 'fs';
import YAML from 'yaml';

const ROUTES_YML = 'docs/nav/routes.yml';
const OUTPUT_JSON = 'prototype/data/routes.json';

const routes = YAML.parse(readFileSync(ROUTES_YML, 'utf8'));
writeFileSync(OUTPUT_JSON, JSON.stringify(routes, null, 2), 'utf8');
console.log(`✅ Generated ${OUTPUT_JSON}`);

