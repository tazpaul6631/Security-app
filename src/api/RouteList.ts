import request from '@/services/apiService';

export default {
    postListRoute() {
        return request.post('/RouteView/getlist', {});
    }
};