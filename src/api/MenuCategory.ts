import request from '@/services/apiService';

export default {
  postMenuCategory() {
    return request.post(`/MenuCategory/getlist`, {});
  },
};