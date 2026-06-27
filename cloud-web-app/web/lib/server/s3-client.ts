export const createUploadUrl = async (
  projectId: string,
  assetType: string,
  fileName: string,
  mimeType: string,
  expiresInSeconds: number = 300
): Promise<{ uploadUrl: string; storageKey: string; assetId: string }> => {
  const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const storageKey = `projects/${projectId}/${assetType}/${assetId}/${fileName}`;
  return {
    uploadUrl: `https://mock-s3-bucket.s3.amazonaws.com/${storageKey}?sig=mock&expires=${expiresInSeconds}`,
    storageKey,
    assetId,
  };
};

export const getSignedDownloadUrl = async (key: string) => {
  return `https://mock-s3-bucket.s3.amazonaws.com/${key}?sig=mock`;
};
