//pinning/pinata.js
import axios from 'axios';
import FormData from 'form-data';

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/**
 * Uploads a file buffer to Pinata IPFS and returns the CID
 * @param {Buffer} buffer - The file buffer
 * @param {string} fileName - The original file name
 * @param {string} mimeType - The MIME type of the file
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<string>} - The IPFS CID
 */
export const uploadFileToIPFS = async (buffer, fileName, mimeType, retries = 3) => {
    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) {
        throw new Error('PINATA_JWT is not defined in environment variables');
    }

    try {
        console.log(`Preparing to upload to Pinata: ${fileName}, size: ${buffer.length}, type: ${mimeType}`);

        const formData = new FormData();
        formData.append('file', buffer, {
            filename: fileName,
            contentType: mimeType,
        });
        formData.append('pinataMetadata', JSON.stringify({ name: fileName }));

        const headers = {
            Authorization: `Bearer ${PINATA_JWT}`,
            ...formData.getHeaders(), // Use form-data's built-in boundary
        };

        console.log(`Uploading to Pinata with headers:`, { Authorization: 'Bearer [REDACTED]', 'Content-Type': headers['content-type'] });

        const response = await axios.post(PINATA_API_URL, formData, {
            headers,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000, // Increased timeout for larger files
        });

        if (response.data && response.data.IpfsHash) {
            console.log(`Pinata upload successful for ${fileName}, CID: ${response.data.IpfsHash}`);
            return response.data.IpfsHash;
        } else {
            throw new Error('Pinata response missing IpfsHash');
        }
    } catch (error) {
        const errorDetails = error.response?.data?.error?.details || error.message;
        console.error(`Pinata upload error for ${fileName} (retries left: ${retries}):`, errorDetails);

        if (retries > 0) {
            const delay = 2000 * (4 - retries); // Exponential backoff: 2s, 4s, 6s
            console.log(`Retrying upload for ${fileName} after ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return uploadFileToIPFS(buffer, fileName, mimeType, retries - 1);
        }

        const errorMessage = error.response?.status === 429
            ? 'Pinata rate limit exceeded'
            : `Failed to upload ${fileName} to Pinata: ${errorDetails}`;
        throw new Error(errorMessage);
    }
};