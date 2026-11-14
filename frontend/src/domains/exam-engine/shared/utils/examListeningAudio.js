const isGatewayListeningTest = (testType) =>
  String(testType || '').trim().toLowerCase() === 'gateway-listening';

export const getListeningAudioMetadata = (test, routeTestType) => {
  const isGatewayListening = isGatewayListeningTest(test?.testType || routeTestType);
  const partAudioUrls = (test?.parts || []).map((part) =>
    part?.audioUrl ? String(part.audioUrl).trim() : ''
  );

  if (isGatewayListening && partAudioUrls.some(Boolean)) {
    const fallbackUrl =
      String(test?.mainAudioUrl || '').trim() || partAudioUrls.find(Boolean) || '';
    const uniquePartAudioUrls = new Set(
      partAudioUrls.map((url) => url || fallbackUrl).filter(Boolean)
    );
    return {
      hasAudio: uniquePartAudioUrls.size > 0,
      uniqueCount: uniquePartAudioUrls.size,
      isSingleFile: uniquePartAudioUrls.size <= 1,
      usesMain: false,
    };
  }

  if (test?.mainAudioUrl) {
    return {
      hasAudio: true,
      uniqueCount: 1,
      isSingleFile: true,
      usesMain: true,
    };
  }

  const uniqueAudioUrls = new Set(partAudioUrls.filter(Boolean));
  return {
    hasAudio: uniqueAudioUrls.size > 0,
    uniqueCount: uniqueAudioUrls.size,
    isSingleFile: uniqueAudioUrls.size === 1,
    usesMain: false,
  };
};

export const getCurrentListeningAudioUrl = (
  test,
  currentPart,
  globalAudioUrl,
  routeTestType
) => {
  const partAudioUrl = String(currentPart?.audioUrl || '').trim();
  if (isGatewayListeningTest(test?.testType || routeTestType) && partAudioUrl) {
    return partAudioUrl;
  }

  return test?.mainAudioUrl || partAudioUrl || globalAudioUrl || '';
};
