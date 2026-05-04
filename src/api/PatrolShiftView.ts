import request from '@/services/apiService';

export default {
  postPatrolShiftView(data: any) {
    return request.post('/PatrolShiftView/getlist', data);
  },
};