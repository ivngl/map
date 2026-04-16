import fs from 'fs';

const content = fs.readFileSync('src/svgMapData.tsx', 'utf8');

// Structure:
// Line ~1-103: interfaces + MOCK_REGIONS array ending with ]
// Line ~106+: export const AREAS = [...]

// 1. Find AREAS start and its closing ]
const areasDeclIdx = content.indexOf('export const AREAS');
const areasArrStart = content.indexOf('[', areasDeclIdx);

// Find closing ] for AREAS - count brackets from areasArrStart
let depth = 0;
let areasArrEnd = -1;
for (let i = areasArrStart; i < content.length; i++) {
  if (content[i] === '[') depth++;
  if (content[i] === ']') {
    depth--;
    if (depth === 0) { areasArrEnd = i; break; }
  }
}

const areasJson = content.substring(areasArrStart, areasArrEnd + 1);
const areas = JSON.parse(areasJson);
console.log('AREAS parsed, array length:', areas.length);

// Flatten areas into name->object map
const areaMap = new Map();
function flatten(items) {
  for (const item of items) {
    areaMap.set(item.name, item);
    if (item.areas && item.areas.length > 0) flatten(item.areas);
  }
}
flatten(areas);
console.log('Total area entries:', areaMap.size);

// 2. Parse MOCK_REGIONS - find the array bounds
const mockDeclIdx = content.indexOf('export const MOCK_REGIONS');
const mockArrStart = content.indexOf('[', mockDeclIdx);

// Find closing ] for MOCK_REGIONS (before AREAS declaration)
depth = 0;
let mockArrEnd = -1;
for (let i = mockArrStart; i < areasDeclIdx; i++) {
  if (content[i] === '{') depth++;
  if (content[i] === '}') depth--;
  if (content[i] === ']' && depth === 0) { mockArrEnd = i; break; }
}

const mockJsonStr = content.substring(mockArrStart, mockArrEnd + 1);
console.log('MOCK_REGIONS JSON string length:', mockJsonStr.length);

// Convert TS syntax to JSON for parsing
const fixedJson = mockJsonStr
  .replace(/(\w+):/g, '"$1":')
  .replace(/,\s*}/g, '}')
  .replace(/,\s*\]/g, ']');

const mockRegions = JSON.parse(fixedJson);
console.log('MOCK_REGIONS parsed:', mockRegions.length);

// 3. Match by name
let matched = 0;
const updated = mockRegions.map(r => {
  const area = areaMap.get(r.name);
  if (area) { matched++; return { ...r, area }; }
  return r;
});
console.log('Matched:', matched, '/', mockRegions.length);

const unmatched = updated.filter(r => !r.area).map(r => r.name);
if (unmatched.length > 0) console.log('Unmatched:', unmatched);

// 4. Update interface to include area field
const newInterface = content.replace(
  /pointer\?: Pointer \| null;\n}/,
  'pointer?: Pointer | null;\n\tarea?: Record<string, unknown>;\n}'
);

// 5. Rebuild MOCK_REGIONS in TS format
function toTS(obj) {
  let s = '\t{\n';
  s += `\t\tid: "${obj.id}",\n`;
  s += `\t\tname: "${obj.name}",\n`;
  s += `\t\tpath: "${obj.path}",\n`;
  if (obj.area) {
    s += `\t\tarea: ${JSON.stringify(obj.area)},\n`;
  }
  s += '\t}';
  return s;
}

const before = newInterface.substring(0, mockArrStart);
const after = newInterface.substring(mockArrEnd + 1);

const newContent = before + '[\n' + updated.map(toTS).join(',\n') + '\n]' + after;

fs.writeFileSync('src/svgMapData.tsx', newContent);
console.log('File written. Lines:', newContent.split('\n').length);
