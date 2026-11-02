/** Simulates the timestamp precondition used by user_documents writes. */
export function conditionalWrite(row, expectedTimestamp, nextPayload, nextTimestamp) {
  if (row && row.updated_at !== expectedTimestamp) return {ok:false, reason:'stale', row};
  if (!row && expectedTimestamp != null) return {ok:false, reason:'stale', row:null};
  if (row && expectedTimestamp == null) return {ok:false, reason:'stale', row};
  return {ok:true, row:{updated_at:nextTimestamp,payload:structuredClone(nextPayload)}};
}
