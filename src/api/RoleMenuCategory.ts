import request from '@/services/apiService';

export default {
  postRoleMenuCategory() {
    return request.post(`/RoleMenuCategory/getlist`, {});
  },
};