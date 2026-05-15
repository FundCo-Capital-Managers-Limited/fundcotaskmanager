import axios from 'axios';
import FormData from 'form-data';

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const DEFAULT_TIMEOUT_MS = Number(process.env.PINATA_UPLOAD_TIMEOUT_MS || 300000);
const MAX_TIMEOUT_MS = 600000;

const resolveTimeout = (bytes = 0) => {
  const sizeMb = Math.max(1, Math.ceil(Number(bytes || 0) / (1024 * 1024)));
  return Math.min(MAX_TIMEOUT_MS, Math.max(DEFAULT_TIMEOUT_MS, sizeMb * 45000));
};

const getErrorDetails = (error) =>
  error?.response?.data?.error?.details
  || error?.response?.data?.error
  || error?.response?.data?.message
  || error?.message
  || 'Unknown Pinata error';

const isRetryableError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return [
    'ECONNABORTED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EAI_AGAIN',
    'ENOTFOUND',
    'ERR_NETWORK',
    'ERR_BAD_RESPONSE',
  ].includes(error?.code);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const uploadFileToIPFS = async (fileInput, fileName, mimeType, retries = 3, fileSize = 0) => {
  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT is not defined in environment variables');
  }

  const totalAttempts = Math.max(1, Number(retries) + 1);
  const payloadSize = Number(fileSize || fileInput?.length || 0);
  const timeout = resolveTimeout(payloadSize);
  let lastError = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      console.log(`Preparing to upload to Pinata: ${fileName}, size: ${payloadSize}, type: ${mimeType}, attempt: ${attempt}/${totalAttempts}, timeout: ${timeout}ms`);

      const formData = new FormData();
      formData.append('file', fileInput, {
        filename: fileName,
        contentType: mimeType,
      });
      formData.append('pinataMetadata', JSON.stringify({ name: fileName }));

      const headers = {
        Authorization: `Bearer ${PINATA_JWT}`,
        ...formData.getHeaders(),
      };

      console.log('Uploading to Pinata with headers:', {
        Authorization: 'Bearer [REDACTED]',
        'Content-Type': headers['content-type'],
      });

      const response = await axios.post(PINATA_API_URL, formData, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout,
        transitional: { clarifyTimeoutError: true },
      });

      if (response.data?.IpfsHash) {
        console.log(`Pinata upload successful for ${fileName}, CID: ${response.data.IpfsHash}`);
        return response.data.IpfsHash;
      }

      throw new Error('Pinata response missing IpfsHash');
    } catch (error) {
      lastError = error;
      const retriesLeft = totalAttempts - attempt;
      const errorDetails = getErrorDetails(error);
      console.error(`Pinata upload error for ${fileName} (retries left: ${retriesLeft}):`, errorDetails);

      if (retriesLeft > 0 && isRetryableError(error)) {
        const backoff = Math.min(15000, 3000 * 2 ** (attempt - 1));
        console.log(`Retrying upload for ${fileName} after ${backoff}ms...`);
        await delay(backoff);
        continue;
      }

      break;
    }
  }

  const errorDetails = getErrorDetails(lastError);
  const status = Number(lastError?.response?.status || 0);
  if (status === 429) {
    throw new Error('Pinata rate limit exceeded. Try again in a few moments.');
  }
  throw new Error(`Failed to upload ${fileName} to Pinata: ${errorDetails}`);
};
