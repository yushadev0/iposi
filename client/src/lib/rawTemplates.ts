/** Raw-body boilerplates per content type, from changeRawType() in the original. */
export const RAW_TYPES: { value: string; label: string }[] = [
  { value: 'application/json', label: 'JSON' },
  { value: 'text/plain', label: 'Text' },
  { value: 'text/html', label: 'HTML' },
  { value: 'application/xml', label: 'XML' },
  { value: 'text/javascript', label: 'JavaScript' },
];

const TEMPLATES: Record<string, string> = {
  'application/json': '{\n  "key": "value"\n}',
  'text/html':
    '<!DOCTYPE html>\n<html>\n<head>\n  <title>Iposi Test</title>\n</head>\n<body>\n  \n</body>\n</html>',
  'application/xml': '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>',
  'text/javascript': 'function testApi() {\n  console.log("Hello Iposi!");\n}',
  'text/plain': '',
};

// Exactly the placeholders the original changeRawType() treats as replaceable.
const REPLACEABLE = new Set(['', '{\n  \n}', '{}']);

/**
 * When the editor still holds an untouched placeholder, swapping the raw type
 * swaps in that type's template. A body the user actually wrote is left alone.
 */
export function templateForRawType(mode: string, currentBody: string): string | null {
  if (!REPLACEABLE.has(currentBody.trim())) return null;
  return TEMPLATES[mode] ?? '';
}
