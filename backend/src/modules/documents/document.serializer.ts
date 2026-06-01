type DocumentRow = Record<string, unknown>;

export function serializeDocument(row: DocumentRow) {
  const { storage_path: _storagePath, storage_bucket: _storageBucket, ...safe } = row;
  return safe;
}
