import request from '@/services/apiService';

export default {
  postCheckPointBU() {
    return request.post('/CheckPoint/getlist', {});
  },
  getCheckPointBUId(id: any) {
    return request.get(`/CheckPoint/getone/${id}`);
  }
};