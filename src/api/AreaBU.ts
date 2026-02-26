import request from '@/services/apiService';

export default {
  postAreaBU() {
    return request.post('/Area/getlist', {});
  },
  getAreaBUId(id: any) {
    return request.get(`/Area/getone/${id}`);
  }
};