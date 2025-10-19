export async function postTldr(payload: any, signal?: AbortSignal): Promise<any> {
  const response = await fetch('/api/tldr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(payload),
    signal
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Invalid response format. ${text.slice(0, 200)}`);
  }

  const responseData = await response.json();

  if (!response.ok) {
    const baseErr = responseData?.error || `HTTP ${response.status}: ${response.statusText}`;
    const details = responseData?.details ? ` Details: ${responseData.details}` : '';
    throw new Error(baseErr + details);
  }

  return responseData;
}
