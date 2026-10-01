const required = rule => rule.required();
const sourceReceipt = { name: 'sourceReceipt', title: 'Source receipt', type: 'object', fields: [
  { name: 'title', type: 'string', validation: required },
  { name: 'url', type: 'url', validation: rule => rule.required().uri({ scheme: ['https'] }) },
  { name: 'kind', type: 'string', options: { list: ['official'] }, validation: required },
  { name: 'checkedAt', type: 'datetime', validation: required }
] };
const claim = { name: 'claim', title: 'Verifiable claim', type: 'object', fields: [
  { name: 'field', type: 'string', options: { list: ['entryFee', 'cash', 'deadline', 'aiPolicy', 'eligibility', 'payout'] }, validation: required },
  { name: 'text', type: 'text', rows: 3, validation: required },
  { name: 'verdict', type: 'string', options: { list: ['supported', 'unknown', 'contradicted'] }, validation: required },
  { name: 'sourceKey', type: 'string', description: 'The matching source receipt _key; supported claims must have one.' }
] };
const reviewEvent = { name: 'reviewEvent', title: 'Review transition', type: 'object', fields: [
  { name: 'from', type: 'string', readOnly: true }, { name: 'to', type: 'string', readOnly: true },
  { name: 'actor', type: 'string', readOnly: true }, { name: 'note', type: 'text', readOnly: true },
  { name: 'at', type: 'datetime', readOnly: true }, { name: 'evidenceVersion', type: 'number', readOnly: true },
  { name: 'profile', type: 'object', readOnly: true, fields: [ { name: 'country', type: 'string' }, { name: 'adult', type: 'boolean' }, { name: 'aiMode', type: 'string' }, { name: 'paypalOnly', type: 'boolean' } ] }
] };
const opportunity = { name: 'opportunity', title: 'Public income opportunity', type: 'document', fields: [
  { name: 'title', type: 'string', validation: required },
  { name: 'category', type: 'string', options: { list: ['Build', 'Research', 'Game'] }, validation: required },
  { name: 'summary', type: 'text', rows: 3, validation: required },
  { name: 'deliverable', type: 'text', rows: 2, validation: required },
  { name: 'entryFee', type: 'number', validation: rule => rule.required().min(0) },
  { name: 'cashPrize', type: 'number', validation: rule => rule.required().positive() },
  { name: 'currency', type: 'string', validation: required },
  { name: 'prizeQualifier', type: 'string' },
  { name: 'startsAt', type: 'datetime', validation: required },
  { name: 'deadline', type: 'datetime', validation: required },
  { name: 'aiMode', type: 'string', options: { list: ['assisted', 'autonomous'] }, validation: required },
  { name: 'payout', type: 'string', options: { list: ['paypal', 'unknown', 'bank'] }, validation: required },
  { name: 'excludedCountries', type: 'array', of: [{ type: 'string' }] },
  { name: 'sources', type: 'array', of: [{ type: 'sourceReceipt' }], validation: required },
  { name: 'claims', type: 'array', of: [{ type: 'claim' }], validation: required },
  { name: 'state', type: 'string', options: { list: ['draft', 'review', 'approved', 'blocked'] }, readOnly: true, validation: required },
  { name: 'version', type: 'number', readOnly: true, validation: rule => rule.required().integer().min(0) },
  { name: 'history', type: 'array', of: [{ type: 'reviewEvent' }], readOnly: true },
  { name: 'updatedAt', type: 'datetime', readOnly: true }
], preview: { select: { title: 'title', subtitle: 'state' } } };
export const schemaTypes = [sourceReceipt, claim, reviewEvent, opportunity];
