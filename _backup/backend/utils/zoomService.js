// backend/utils/zoomService.js
import axios from 'axios';
import jwt from 'jsonwebtoken';

let cachedToken = null;
let tokenExpiry = null;

export const getAccessToken = async () => {
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await axios.post('https://api.zoom.us/oauth/token', null, {
      params: {
        grant_type: 'account_credentials',
        account_id: process.env.ZOOM_ACCOUNT_ID,
      },
      auth: {
        username: process.env.ZOOM_CLIENT_ID,
        password: process.env.ZOOM_CLIENT_SECRET,
      },
    });
    cachedToken = response.data.access_token;
    tokenExpiry = now + response.data.expires_in * 1000 - 60000;
    return cachedToken;
  } catch (error) {
    throw error;
  }
};

export const createZoomMeeting = async (topic, startTime, duration) => {
  const token = await getAccessToken();
  const response = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic,
      type: 2,
      start_time: startTime,
      duration,
      timezone: 'UTC',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        // Removed auto_recording and transcription to avoid scope issues
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const updateZoomMeeting = async (meetingId, updates) => {
  const token = await getAccessToken();
  await axios.patch(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    updates,
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export const deleteZoomMeeting = async (meetingId) => {
  const token = await getAccessToken();
  await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getZoomTranscript = async (meetingId) => {
  const recordings = await getZoomMeetingRecordings(meetingId);
  const transcriptFile = recordings.find(file => file.file_type === 'TRANSCRIPT');
  if (!transcriptFile) throw new Error('No transcript found');
  const token = await getAccessToken();
  const response = await axios.get(`${transcriptFile.download_url}?access_token=${token}`);
  return response.data;
};

export const getZoomMeetingRecordings = async (meetingId) => {
  const token = await getAccessToken();
  const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.recording_files;
};

export const generateSignature = (meetingNumber, role) => {
  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60;
  return jwt.sign({
    appKey: process.env.ZOOM_SDK_KEY,
    sdkKey: process.env.ZOOM_SDK_KEY,
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp,
  }, process.env.ZOOM_SDK_SECRET);
};