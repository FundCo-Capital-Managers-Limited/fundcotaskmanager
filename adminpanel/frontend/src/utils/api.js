import axios from 'axios';
import { attachAdminAuthInterceptors, getAdminApiBase } from '../security/authClient.js';
const API_BASE = getAdminApiBase();

const api = attachAdminAuthInterceptors(
  axios.create({
    baseURL: `${API_BASE}/api/admin`,
    withCredentials: true,
  })
);

export default api;
export { API_BASE };



