import { useDocumentOperation } from 'sanity';
export function invalidateOnPublish(originalAction) {
  return function PublishWithFreshReview(props) {
    const original = originalAction(props);
    const { patch } = useDocumentOperation(props.id, props.type);
    if (!original) return null;
    return { ...original, onHandle: () => {
      const doc = props.draft || props.published;
      // A content edit must not inherit an earlier decision about other evidence.
      patch.execute([{ set: { state: 'draft', version: (doc?.version || 0) + 1, updatedAt: new Date().toISOString() } }]);
      original.onHandle();
    } };
  };
}
