import request from '@/services/apiService';

export default {
    postLogout(data: any) {
        return request.post('/User/logout', data);
    }
};