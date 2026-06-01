export function serializeDocument(row) {
    const { storage_path: _storagePath, storage_bucket: _storageBucket, ...safe } = row;
    return safe;
}
