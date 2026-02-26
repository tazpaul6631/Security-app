import request from '@/services/apiService';

export default {
  postAppSettings() {
    return request.post(`/AppSetting/getlist`, {});
  }
};