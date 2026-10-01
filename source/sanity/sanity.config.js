import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes/index.mjs';
import { ReviewAction } from './actions/ReviewAction.jsx';
import { invalidateOnPublish } from './actions/InvalidateOnPublish.jsx';
export default defineConfig({ name: 'proof-desk', title: 'Proof Desk', projectId: 'ofdsgt18', dataset: 'production', plugins: [structureTool()], schema: { types: schemaTypes }, document: { actions: (previous, context) => context.schemaType === 'opportunity' ? [ReviewAction, ...previous.map(action => action.action === 'publish' ? invalidateOnPublish(action) : action)] : previous } });
