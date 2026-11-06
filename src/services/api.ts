
const DEVELOPMENT_API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";

export const getApiUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  const baseUrl = configuredUrl || DEVELOPMENT_API_BASE_URL;

  return baseUrl.replace(/\/+$/, "");
};

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const baseUrl = getApiUrl();

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const requestUrl = `${baseUrl}${normalizedEndpoint}`;

  try {
    console.log("API Request URL:", requestUrl);

    const response = await fetch(requestUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const responseText = await response.text();

    let data: any;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      console.error("API returned a non-JSON response:", responseText);
      throw new Error(
        `Server returned an invalid response (HTTP ${response.status}).`
      );
    }

    if (!response.ok) {
      console.error("API Response Error:", response.status, data);

      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed with status ${response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error("API Error:", requestUrl, error);
    throw error;
  }
};
